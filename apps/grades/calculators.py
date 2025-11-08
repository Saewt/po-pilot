from decimal import Decimal
from django.db.models import Avg,Count,Q
from apps.courses.models import (LearningOutcome,AssessmentToLOContribution,LOtoPOContribution)
from apps.grades.models import AssessmentGrade

class AchievementCalculator:

    @staticmethod
    def calculate_lo_achievement(student, learning_outcome):

        contributions = AssessmentToLOContribution.objects.filter(learning_outcome=learning_outcome).select_related('assessment')

        if not contributions.exists():
            return None
        total_weighted_score = Decimal(0)
        total_weight = Decimal(0)
        for contribution in contributions:
            try:
                grade= AssessmentGrade.objects.get(student=student, assessment=contribution.assessment)
                score= Decimal(str(grade.score))
                weight = contribution.weight
                total_weighted_score += score * weight
                total_weight += weight
            except AssessmentGrade.DoesNotExist:
                continue
        if total_weight == 0:
            return None
        achievement = total_weighted_score / total_weight
        return round(float(achievement), 2)
    
    @staticmethod
    def calculate_po_achievement_for_course(student, course, program_outcome):

        learning_outcomes = LearningOutcome.objects.filter(course=course)
        contributions = LOtoPOContribution.objects.filter(
            program_outcome = program_outcome,
            learning_outcome__in=learning_outcomes,
            is_approved=True
        ).select_related('learning_outcome')
        if not contributions.exists():
            return None
        total_weighted_achievement = Decimal(0)
        total_weight = Decimal(0)
        for contribution in contributions:
            lo_achievement = AchievementCalculator.calculate_lo_achievement(student, contribution.learning_outcome)
            if lo_achievement is not None:
                weight = contribution.weight
                total_weighted_achievement += Decimal(str(lo_achievement)) * weight
                total_weight += weight
        if total_weight == 0:
            return None
        po_achievement = total_weighted_achievement / total_weight
        return round(float(po_achievement), 2)
    @staticmethod
    def calculate_all_po_achievements_for_course(student, course):
        program_outcomes = course.department.program_outcomes.filter(is_active=True)
        results = []
        for po in program_outcomes:
            achievement = AchievementCalculator.calculate_po_achievement_for_course(student, course, po)
            if achievement is not None:
                results.append({
                    'program_outcome': po,
                    'achievement': achievement
                })
        return results
    
    @staticmethod
    def calculate_student_overall_po_achievements(student):
        
        courses = student.enrolled_courses.filter(is_active=True)
        if not student.department:
            return []
        program_outcomes = student.department.program_outcomes.filter(is_active=True)
        results = []
        for po in program_outcomes:
            total_weighted_achievement = Decimal(0)
            total_credit_weight = Decimal(0)
            contributing_courses = []
            for course in courses:
                achievement = AchievementCalculator.calculate_po_achievement_for_course(student, course, po)
                if achievement is not None:
                    weighted_achievement = Decimal(str(achievement)) * course.credit
                    total_weighted_achievement += weighted_achievement
                    total_credit_weight += course.credit
                    contributing_courses.append(
                        {
                            'course': course,
                            'achievement': achievement
                        }
                    )
            if total_credit_weight > 0:
                overall_achievement = total_weighted_achievement / total_credit_weight
                results.append({
                    'program_outcome': po,
                    'overall_achievement': round(float(overall_achievement), 2),
                    'contributing_courses': contributing_courses,
                    'course_count': len(contributing_courses)
                })
        return results

    @staticmethod
    def get_course_lo_statistics(course):
        learning_outcomes = LearningOutcome.objects.filter(course=course)
        students = course.students.all()
        
        results = []
        for lo in learning_outcomes:
            achievements = []
            
            for student in students:
                achievement = AchievementCalculator.calculate_lo_achievement(student, lo)
                if achievement is not None:
                    achievements.append(achievement)
            
            if achievements:
                results.append({
                    'learning_outcome': lo,
                    'average': round(sum(achievements) / len(achievements), 2),
                    'min': round(min(achievements), 2),
                    'max': round(max(achievements), 2),
                    'student_count': len(achievements)
                })
        
        return results