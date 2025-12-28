from collections import defaultdict
from decimal import Decimal
from django.db.models import Avg,Count,Q,Prefetch
from apps.courses.models import (LearningOutcome,AssessmentToLOContribution,LOtoPOContribution,CourseInstance,CourseTemplate)
from apps.grades.models import AssessmentGrade


class AchievementCalculator:

    @staticmethod
    def calculate_all_po_achievement_for_course(student, course_instance: CourseInstance):
        course_template = course_instance.course_template
        program_outcomes = course_template.department.program_outcomes.filter(is_active=True)

        los_with_po_conts = LearningOutcome.objects.filter(
            course_template=course_template
        ).prefetch_related(
            Prefetch(
                'po_contributions',
                queryset=LOtoPOContribution.objects.filter(approval_status='APPROVED', program_outcome__in=program_outcomes),
                to_attr='approved_po_conts'
            ),
            Prefetch(
                'assessment_contributions',
                queryset=AssessmentToLOContribution.objects.filter(assessment__course_instance=course_instance),
                to_attr='relevant_assessment_conts'
            )
        )
        student_grades = AssessmentGrade.objects.filter(
            student=student,
            assessment__course_instance=course_instance,
        )
        grades_map = {grade.assessment_id: grade.score for grade in student_grades}
        assessment_lo_map = defaultdict(list)
        lo_po_map = defaultdict(list)
        lo_cache = {}
        for lo in los_with_po_conts:
            for cont in lo.relevant_assessment_conts:
                assessment_lo_map[lo.id].append((cont.assessment_id, cont.weight))
            for cont in lo.approved_po_conts:
                lo_po_map[cont.program_outcome_id].append((lo.id, cont.weight))
        results = []
        for po in program_outcomes:
            po_ach_total = Decimal(0)
            po_weight_total  = Decimal(0)
            for lo_id, po_weight in lo_po_map.get(po.id, []):
                if lo_id not in lo_cache:
                    lo_score_total = Decimal(0)
                    lo_weight_total = Decimal(0)
                    for assessment_id, assess_lo_weight in assessment_lo_map.get(lo_id, []):
                        score = grades_map.get(assessment_id)
                        if score is not None:
                            lo_score_total += score * assess_lo_weight
                            lo_weight_total += assess_lo_weight
                    if lo_weight_total > 0:
                        lo_cache[lo_id] = lo_score_total / lo_weight_total
                    else:
                        lo_cache[lo_id] = None
                lo_achievement = lo_cache.get(lo_id)
                if lo_achievement is not None:
                    po_ach_total += lo_achievement * po_weight
                    po_weight_total += po_weight

            if po_weight_total > 0:
                po_achievement = po_ach_total / po_weight_total
                results.append({
                    'program_outcome': po,
                    'achievement': round(float(po_achievement), 2)
                })
        return results
    
    @staticmethod
    def calculate_student_overall_po_achievements(student):
        if not student.department:
            return []
        program_outcomes = student.department.program_outcomes.filter(is_active=True)
        # Include BOTH active and completed courses for overall PO achievement
        enrolled_courses = student.enrolled_courses.all().select_related('course_template__department')
        course_templates = [c.course_template for c in enrolled_courses]
        
        student_grades = AssessmentGrade.objects.filter(
            student=student,
            assessment__course_instance__in=enrolled_courses)
        los_with_conts = LearningOutcome.objects.filter(
            course_template__in=course_templates
        ).prefetch_related(
            Prefetch(
                'po_contributions',
                queryset=LOtoPOContribution.objects.filter(approval_status='APPROVED', program_outcome__in=program_outcomes),
                to_attr='approved_po_conts'
            ),
            'assessment_contributions__assessment'
        )
        grades_map = {grade.assessment_id: grade.score for grade in student_grades}
        
        course_credit_map = {ct.id: Decimal(ct.credit) for ct in course_templates}
        
        assessment_lo_map = defaultdict(list)
        lo_po_map = defaultdict(list)
        lo_cache = defaultdict(dict)
        for lo in los_with_conts:
            for cont in lo.assessment_contributions.all():
                assessment_lo_map[lo.id].append(
                    (cont.assessment_id, cont.weight, cont.assessment.course_instance_id)
                )
            for cont in lo.approved_po_conts:
                lo_po_map[cont.program_outcome_id].append(
                    (lo.id, cont.weight, lo.course_template_id)
                )
        results = []
        for po in program_outcomes:
            total_weighted_achievement = Decimal(0)
            total_credit_weight = Decimal(0)
            contributing_courses_list = []
            for course in enrolled_courses:
                course_template_id = course.course_template_id
                course_id = course.id
                
                total_weighted_po_ach_for_course = Decimal(0)
                total_po_weight_for_course = Decimal(0)

                
                relevant_los = [
                    (lo_id, weight) for lo_id, weight, ct_id in lo_po_map.get(po.id, [])
                    if ct_id == course_template_id
                ]

                for lo_id, lo_po_weight in relevant_los:
                    
                    
                    if lo_id not in lo_cache[course_id]:
                        total_weighted_lo_score = Decimal(0)
                        total_lo_weight = Decimal(0)
                        
                        
                        relevant_assessments = [
                            (assess_id, weight) for assess_id, weight, c_id in assessment_lo_map.get(lo_id, [])
                            if c_id == course_id
                        ]

                        for assessment_id, assess_lo_weight in relevant_assessments:
                            score = grades_map.get(assessment_id) 
                            if score is not None:
                                total_weighted_lo_score += score * assess_lo_weight
                                total_lo_weight += assess_lo_weight
                        
                        if total_lo_weight > 0:
                            lo_cache[course_id][lo_id] = total_weighted_lo_score / total_lo_weight
                        else:
                            lo_cache[course_id][lo_id] = None
                    
                   
                    
                    lo_achievement = lo_cache[course_id].get(lo_id)
                    
                    if lo_achievement is not None:
                        total_weighted_po_ach_for_course += lo_achievement * lo_po_weight
                        total_po_weight_for_course += lo_po_weight

                
                
                if total_po_weight_for_course > 0:
                    course_po_achievement = total_weighted_po_ach_for_course / total_po_weight_for_course
                    credit = course_credit_map.get(course_template_id, Decimal(0))
                    
                    
                    total_weighted_achievement += course_po_achievement * credit
                    total_credit_weight += credit
                    
                    contributing_courses_list.append({
                        'course': course,
                        'achievement': round(float(course_po_achievement), 2)
                    })

            
            
            if total_credit_weight > 0:
                overall_achievement = total_weighted_achievement / total_credit_weight
                results.append({
                    'program_outcome': po,
                    'overall_achievement': round(float(overall_achievement), 2),
                    'contributing_courses': contributing_courses_list,
                    'course_count': len(contributing_courses_list)
                })
                
        return results
    
    @staticmethod
    def get_course_lo_statistics(course_instance: CourseInstance):
        students = course_instance.students.all()
        student_ids = [s.id for s in students]
        learning_outcomes = LearningOutcome.objects.filter(
            course_template=course_instance.course_template
        ).prefetch_related(
            Prefetch(
                'assessment_contributions',
                queryset=AssessmentToLOContribution.objects.filter(assessment__course_instance=course_instance),
                to_attr='relevant_assessment_conts'
            )
        )

        all_grades = AssessmentGrade.objects.filter(
            assessment__course_instance=course_instance,
            student_id__in=student_ids
        )

      
        
        
        grades_map = {(grade.student_id, grade.assessment_id): grade.score for grade in all_grades}
        
        
        assessment_lo_map = defaultdict(list)
        for lo in learning_outcomes:
            for cont in lo.relevant_assessment_conts:
                assessment_lo_map[lo.id].append((cont.assessment_id, cont.weight))

        
        results = []
        for lo in learning_outcomes:
            
            achievements_float = [] 
            assessments_for_this_lo = assessment_lo_map.get(lo.id, [])
            
            if not assessments_for_this_lo:
                continue 

            for student in students:
                total_weighted_lo_score = Decimal(0)
                total_lo_weight = Decimal(0)
                
                for assessment_id, assess_lo_weight in assessments_for_this_lo:
                    score = grades_map.get((student.id, assessment_id)) 
                    
                    if score is not None:
                        total_weighted_lo_score += score * assess_lo_weight
                        total_lo_weight += assess_lo_weight
                
                if total_lo_weight > 0:
                    lo_achievement = total_weighted_lo_score / total_lo_weight
                    achievements_float.append(float(lo_achievement))
            
            # Done LO stats
            
            if achievements_float:
                results.append({
                    'learning_outcome': lo,
                    'average': round(sum(achievements_float) / len(achievements_float), 2),
                    'min': round(min(achievements_float), 2),
                    'max': round(max(achievements_float), 2),
                    'student_count': len(achievements_float)
                })
        
        return results
        
    @staticmethod
    def calculate_final_course_grade(student, course_instance, pre_fetched_grades=None, pre_fetched_assessments=None):
        assessments = pre_fetched_assessments if pre_fetched_assessments is not None else course_instance.assessments.all()
        
        if pre_fetched_grades is not None:
            # Use pre-fetched list/queryset
            grades_map = {grade.assessment_id: grade.score for grade in pre_fetched_grades}
        else:
            student_grades = AssessmentGrade.objects.filter(
                student=student,
                assessment__in=assessments
            )
            grades_map = {grade.assessment_id: grade.score for grade in student_grades}
        
        total_score = Decimal(0)
        total_possible_weight = Decimal(0)
        
        for assessment in assessments:
            score = grades_map.get(assessment.id)
            if score is not None:
                if assessment.max_score > 0:
                    contribution = (score / assessment.max_score) * assessment.weight
                    total_score += contribution
            
            total_possible_weight += assessment.weight
            
        score_val = float(total_score) if total_possible_weight > 0 else 0.0
        letter_grade = "FF"
        if score_val >= 90: letter_grade = "AA"
        elif score_val >= 85: letter_grade = "BA"
        elif score_val >= 80: letter_grade = "BB"
        elif score_val >= 70: letter_grade = "CB"
        elif score_val >= 60: letter_grade = "CC"
        elif score_val >= 55: letter_grade = "DC"
        elif score_val >= 50: letter_grade = "DD"
        
        # Normalize score to 100% scale if weights don't sum to 100
        normalized_score = score_val
        if total_possible_weight > 0 and total_possible_weight != 100:
            normalized_score = (Decimal(score_val) / total_possible_weight) * 100
        else:
            normalized_score = score_val
        
        return {
            "total_score": round(score_val, 2),
            "normalized_score": round(normalized_score, 2),
            "letter_grade": letter_grade,
            "total_possible_weight": float(total_possible_weight)
        }

    @staticmethod
    def calculate_student_gpa(student):
        points_map = {
            "AA": 4.00, "BA": 3.50, "BB": 3.00, "CB": 2.50,
            "CC": 2.00, "DC": 1.50, "DD": 1.00, "FF": 0.00
        }
        
        courses = student.enrolled_courses.filter(is_active=False).select_related('course_template')
        
        total_points = 0.0
        total_credits = 0
        
        course_details = []
        
        for course in courses:
            grade_info = AchievementCalculator.calculate_final_course_grade(student, course)
            letter = grade_info['letter_grade']
            points = points_map.get(letter, 0.0)
            credit = course.course_template.credit
            
            total_points += points * credit
            total_credits += credit
            
            course_details.append({
                "course_code": course.course_template.code,
                "credit": credit,
                "letter_grade": letter,
                "points": points
            })
            
        gpa = 0.0
        if total_credits > 0:
            gpa = total_points / total_credits
            
        return {
            "gpa": round(gpa, 2),
            "total_credits": total_credits,
            "course_details": course_details
        }
