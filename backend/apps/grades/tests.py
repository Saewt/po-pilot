from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.core.models import Department, ProgramOutcome
from apps.courses.models import (
    CourseTemplate,
    CourseInstance,
    LearningOutcome,
    Assessment,
    AssessmentToLOContribution,
    LOtoPOContribution,
)
from apps.grades.models import AssessmentGrade
from apps.grades.calculators import AchievementCalculator

User = get_user_model()


class AchievementCalculatorTests(TestCase):
    def setUp(self):
        self.dept = Department.objects.create(name="Computer Science", code="CSE")
        self.po1 = ProgramOutcome.objects.create(
            department=self.dept, code="PO-1", description="Critical Thinking"
        )
        self.po2 = ProgramOutcome.objects.create(
            department=self.dept, code="PO-2", description="Coding Skills"
        )

        self.student = User.objects.create_user(
            email="student@example.com",
            password="password",
            role=User.Role.STUDENT,
            department=self.dept,
        )
        self.instructor = User.objects.create_user(
            email="instructor@example.com",
            password="password",
            role=User.Role.INSTRUCTOR,
            department=self.dept,
        )
        self.head = User.objects.create_user(
            email="head@example.com",
            password="password",
            role=User.Role.DEPARTMENT_HEAD,
            department=self.dept,
        )

        self.course_template = CourseTemplate.objects.create(
            department=self.dept,
            code="101",
            name="Intro to CS",
            credit=3,
        )
        self.lo1 = LearningOutcome.objects.create(
            course_template=self.course_template,
            code="LO-1",
            description="Understand basic algorithms",
        )
        self.lo2 = LearningOutcome.objects.create(
            course_template=self.course_template,
            code="LO-2",
            description="Write simple programs",
        )

        self.lopo1 = LOtoPOContribution.objects.create(
            learning_outcome=self.lo1,
            program_outcome=self.po1,
            weight=4.0,
        )
        self.lopo1.approve(self.head)

        self.lopo2 = LOtoPOContribution.objects.create(
            learning_outcome=self.lo2,
            program_outcome=self.po2,
            weight=5.0,
        )
        self.lopo2.approve(self.head)

        self.course_instance = CourseInstance.objects.create(
            course_template=self.course_template,
            semester="Fall",
            year=2024,
            instructor=self.instructor,
        )
        self.course_instance.students.add(self.student)

        self.midterm = Assessment.objects.create(
            course_instance=self.course_instance,
            name="Midterm",
            assessment_type=Assessment.AssessmentType.MIDTERM,
            max_score=100,
            weight=40,
        )
        self.final = Assessment.objects.create(
            course_instance=self.course_instance,
            name="Final",
            assessment_type=Assessment.AssessmentType.FINAL,
            max_score=100,
            weight=60,
        )

        AssessmentToLOContribution.objects.create(
            assessment=self.midterm,
            learning_outcome=self.lo1,
            weight=5.0,  
        )
        AssessmentToLOContribution.objects.create(
            assessment=self.final,
            learning_outcome=self.lo2,
            weight=5.0,
        )

    def test_calculate_all_po_achievement_for_course(self):
        AssessmentGrade.objects.create(
            student=self.student,
            assessment=self.midterm,
            score=80,
            entered_by=self.instructor,
        )
        AssessmentGrade.objects.create(
            student=self.student,
            assessment=self.final,
            score=90,
            entered_by=self.instructor,
        )

        results = AchievementCalculator.calculate_all_po_achievement_for_course(
            self.student, self.course_instance
        )


        po1_result = next(r for r in results if r['program_outcome'] == self.po1)
        po2_result = next(r for r in results if r['program_outcome'] == self.po2)

        self.assertEqual(po1_result['achievement'], 80.00)
        self.assertEqual(po2_result['achievement'], 90.00)

    def test_calculate_student_overall_po_achievements(self):
        course_template2 = CourseTemplate.objects.create(
            department=self.dept,
            code="102",
            name="Data Structures",
            credit=4,  # Higher credit
        )
        lo3 = LearningOutcome.objects.create(
            course_template=course_template2,
            code="LO-1",
            description="Advanced Algos",
        )
        lopo3 = LOtoPOContribution.objects.create(
            learning_outcome=lo3,
            program_outcome=self.po1,
            weight=4.0,
        )
        lopo3.approve(self.head)

        course_instance2 = CourseInstance.objects.create(
            course_template=course_template2,
            semester="Spring",
            year=2025,
            instructor=self.instructor,
        )
        course_instance2.students.add(self.student)

        project = Assessment.objects.create(
            course_instance=course_instance2,
            name="Project",
            assessment_type=Assessment.AssessmentType.PROJECT,
            max_score=100,
            weight=100,
        )
        AssessmentToLOContribution.objects.create(
            assessment=project,
            learning_outcome=lo3,
            weight=5.0,
        )

        AssessmentGrade.objects.create(student=self.student, assessment=self.midterm, score=80) # LO1 -> PO1
        AssessmentGrade.objects.create(student=self.student, assessment=self.final, score=90)   # LO2 -> PO2

        AssessmentGrade.objects.create(student=self.student, assessment=project, score=100)     # LO3 -> PO1

        results = AchievementCalculator.calculate_student_overall_po_achievements(self.student)


        po1_result = next(r for r in results if r['program_outcome'] == self.po1)
        self.assertEqual(po1_result['overall_achievement'], 91.43)

    def test_get_course_lo_statistics(self):
        student2 = User.objects.create_user(
            email="student2@example.com",
            password="password",
            role=User.Role.STUDENT,
            department=self.dept,
        )
        self.course_instance.students.add(student2)

        AssessmentGrade.objects.create(student=self.student, assessment=self.midterm, score=80) # LO1
        
        AssessmentGrade.objects.create(student=student2, assessment=self.midterm, score=60)   # LO1

        stats = AchievementCalculator.get_course_lo_statistics(self.course_instance)
        
        lo1_stats = next(s for s in stats if s['learning_outcome'] == self.lo1)
        
        self.assertEqual(lo1_stats['average'], 70.00)
        self.assertEqual(lo1_stats['min'], 60.00)
        self.assertEqual(lo1_stats['max'], 80.00)
        self.assertEqual(lo1_stats['student_count'], 2)

    def test_complex_scenario_with_statuses_and_counts(self):
        po_inactive = ProgramOutcome.objects.create(
            department=self.dept, code="PO-X", description="Obsolete", is_active=False
        )
        lopo_inactive = LOtoPOContribution.objects.create(
            learning_outcome=self.lo1,
            program_outcome=po_inactive,
            weight=5.0,
        )
        lopo_inactive.approve(self.head)

        course_template_inactive = CourseTemplate.objects.create(
            department=self.dept, code="999", name="Old Course", credit=3
        )
        course_instance_inactive = CourseInstance.objects.create(
            course_template=course_template_inactive,
            semester="Fall",
            year=2020,
            instructor=self.instructor,
            is_active=False  # Inactive
        )
        course_instance_inactive.students.add(self.student)
        
        assess_inactive = Assessment.objects.create(
            course_instance=course_instance_inactive, name="Old Exam", assessment_type="FINAL", weight=100
        )
        lo_inactive = LearningOutcome.objects.create(course_template=course_template_inactive, code="LO-Old", description="Old LO")
        AssessmentToLOContribution.objects.create(assessment=assess_inactive, learning_outcome=lo_inactive, weight=5)
        LOtoPOContribution.objects.create(learning_outcome=lo_inactive, program_outcome=self.po1, weight=5).approve(self.head)
        
        AssessmentGrade.objects.create(student=self.student, assessment=assess_inactive, score=100)

        course_template_no_grades = CourseTemplate.objects.create(
             department=self.dept, code="103", name="No Grades Course", credit=3
        )
        lo_no_grades = LearningOutcome.objects.create(
            course_template=course_template_no_grades, code="LO-NG", description="Nothing"
        )
        LOtoPOContribution.objects.create(
            learning_outcome=lo_no_grades, program_outcome=self.po1, weight=5.0
        ).approve(self.head)
        
        course_instance_no_grades = CourseInstance.objects.create(
            course_template=course_template_no_grades, semester="Spring", year=2024, instructor=self.instructor
        )
        course_instance_no_grades.students.add(self.student)


        lo_unapproved = LearningOutcome.objects.create(
            course_template=self.course_template, code="LO-Unapp", description="Pending"
        )
        LOtoPOContribution.objects.create(
            learning_outcome=lo_unapproved, program_outcome=self.po1, weight=5.0
        )
        assess_unapproved = Assessment.objects.create(
            course_instance=self.course_instance, name="Unapproved Lab", assessment_type="LAB", weight=10
        )
        AssessmentToLOContribution.objects.create(
            assessment=assess_unapproved, learning_outcome=lo_unapproved, weight=5
        )
        AssessmentGrade.objects.create(student=self.student, assessment=assess_unapproved, score=100)

        assess_no_lo = Assessment.objects.create(
            course_instance=self.course_instance, name="Bonus", assessment_type="QUIZ", weight=10
        )
        AssessmentGrade.objects.create(student=self.student, assessment=assess_no_lo, score=100)

        lo_no_po = LearningOutcome.objects.create(
            course_template=self.course_template, code="LO-Orphan", description="No PO"
        )
        AssessmentToLOContribution.objects.create(
            assessment=self.midterm, learning_outcome=lo_no_po, weight=5
        )

        lo_extra = LearningOutcome.objects.create(
            course_template=self.course_template, code="LO-Extra", description="Extra"
        )
        LOtoPOContribution.objects.create(
            learning_outcome=lo_extra, program_outcome=self.po1, weight=1.0
        ).approve(self.head)
        assess_extra = Assessment.objects.create(
            course_instance=self.course_instance, name="Extra HW", assessment_type="HOMEWORK", weight=10
        )
        AssessmentToLOContribution.objects.create(
            assessment=assess_extra, learning_outcome=lo_extra, weight=5
        )
        AssessmentGrade.objects.create(student=self.student, assessment=assess_extra, score=100)

        AssessmentGrade.objects.create(student=self.student, assessment=self.midterm, score=80) 
        AssessmentGrade.objects.create(student=self.student, assessment=self.final, score=90)

        results = AchievementCalculator.calculate_student_overall_po_achievements(self.student)

        
        po_codes = [r['program_outcome'].code for r in results]
        self.assertNotIn("PO-X", po_codes)
        self.assertIn("PO-1", po_codes)
        
        po1_result = next(r for r in results if r['program_outcome'] == self.po1)
        
        contributing_courses = po1_result['contributing_courses']
        course_ids = [c['course'].id for c in contributing_courses]
        
        self.assertIn(self.course_instance.id, course_ids)
        self.assertNotIn(course_instance_inactive.id, course_ids)
        self.assertNotIn(course_instance_no_grades.id, course_ids)
        
        self.assertEqual(po1_result['course_count'], 1)
        self.assertEqual(po1_result['overall_achievement'], 84.00)

        course_not_enrolled = CourseInstance.objects.create(
            course_template=self.course_template, semester="Summer", year=2024, instructor=self.instructor
        )
        assess_not_enrolled = Assessment.objects.create(
            course_instance=course_not_enrolled, name="Ghost Exam", assessment_type="MIDTERM", weight=100
        )
        AssessmentToLOContribution.objects.create(
            assessment=assess_not_enrolled, learning_outcome=self.lo1, weight=5
        )
        
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            AssessmentGrade.objects.create(student=self.student, assessment=assess_not_enrolled, score=100)
        
        results = AchievementCalculator.calculate_student_overall_po_achievements(self.student)
        po1_result = next(r for r in results if r['program_outcome'] == self.po1)
        
        self.assertEqual(po1_result['overall_achievement'], 84.00)
        
        self.assertEqual(po1_result['course_count'], 1)

    def test_student_no_department(self):
        student_no_dept = User.objects.create_user(
            email="nodep@example.com", password="password", role=User.Role.STUDENT
        )
        results = AchievementCalculator.calculate_student_overall_po_achievements(student_no_dept)
        self.assertEqual(results, [])

    def test_lo_contributes_to_multiple_pos(self):
        lopo_new = LOtoPOContribution.objects.create(
            learning_outcome=self.lo1,
            program_outcome=self.po2,
            weight=5.0,
        )
        lopo_new.approve(self.head)
        
        AssessmentGrade.objects.create(student=self.student, assessment=self.midterm, score=80)
        AssessmentGrade.objects.create(student=self.student, assessment=self.final, score=90)
        
        results = AchievementCalculator.calculate_all_po_achievement_for_course(
            self.student, self.course_instance
        )
        
        po2_result = next(r for r in results if r['program_outcome'] == self.po2)
        
        
        self.assertEqual(po2_result['achievement'], 85.00)

    def test_large_scale_po_calculation(self):
        pos = []
        for i in range(1, 16):
            po, _ = ProgramOutcome.objects.get_or_create(
                department=self.dept, code=f"PO-{i}", defaults={"description": f"Outcome {i}"}
            )
            pos.append(po)
        
        target_po = pos[4] 

        courses = []
        for i in range(1, 6):
            ct = CourseTemplate.objects.create(
                department=self.dept, code=f"CS{500+i}", name=f"Course {i}", credit=3
            )
            ci = CourseInstance.objects.create(
                course_template=ct, semester="Fall", year=2024, instructor=self.instructor
            )
            ci.students.add(self.student)
            courses.append(ci)
            
            lo = LearningOutcome.objects.create(course_template=ct, code="LO-1", description="LO 1")
            
            LOtoPOContribution.objects.create(
                learning_outcome=lo, program_outcome=target_po, weight=5.0
            ).approve(self.head)
            
            other_po_idx = (i + 6) % 15
            LOtoPOContribution.objects.create(
                learning_outcome=lo, program_outcome=pos[other_po_idx], weight=3.0
            ).approve(self.head)

            assess = Assessment.objects.create(
                course_instance=ci, name="Exam 1", assessment_type="MIDTERM", weight=100
            )
            AssessmentToLOContribution.objects.create(
                assessment=assess, learning_outcome=lo, weight=5
            )
            
            score = 100 - (i-1)*10
            AssessmentGrade.objects.create(student=self.student, assessment=assess, score=score)

        results = AchievementCalculator.calculate_student_overall_po_achievements(self.student)
        
        
        po5_result = next(r for r in results if r['program_outcome'] == target_po)
        
        self.assertEqual(po5_result['course_count'], 5)
        self.assertEqual(po5_result['overall_achievement'], 80.00)
        
        self.assertTrue(len(results) > 1)

    def test_different_course_credits(self):
        
        courses_data = [
            {"code": "CS201", "name": "Course A", "credit": 2, "score": 60},
            {"code": "CS202", "name": "Course B", "credit": 3, "score": 80},
            {"code": "CS203", "name": "Course C", "credit": 5, "score": 100},
        ]
        
        for data in courses_data:
            ct = CourseTemplate.objects.create(
                department=self.dept, code=data["code"], name=data["name"], credit=data["credit"]
            )
            ci = CourseInstance.objects.create(
                course_template=ct, semester="Fall", year=2024, instructor=self.instructor
            )
            ci.students.add(self.student)
            
            lo = LearningOutcome.objects.create(
                course_template=ct, code="LO-1", description="Main LO"
            )
            
            LOtoPOContribution.objects.create(
                learning_outcome=lo, program_outcome=self.po1, weight=5.0
            ).approve(self.head)
            
            assess = Assessment.objects.create(
                course_instance=ci, name="Final", assessment_type="FINAL", weight=100
            )
            AssessmentToLOContribution.objects.create(
                assessment=assess, learning_outcome=lo, weight=5
            )
            AssessmentGrade.objects.create(
                student=self.student, assessment=assess, score=data["score"]
            )
        
        results = AchievementCalculator.calculate_student_overall_po_achievements(self.student)
        po1_result = next(r for r in results if r['program_outcome'] == self.po1)
        
        self.assertEqual(po1_result['course_count'], 3)
        self.assertEqual(po1_result['overall_achievement'], 86.00)


class UserPOScoreHelperTests(TestCase):
    """Test User model helper methods for PO score calculations."""

    def setUp(self):
        self.dept = Department.objects.create(name="Computer Science", code="CSE")
        self.po1 = ProgramOutcome.objects.create(
            department=self.dept, code="PO-1", description="Critical Thinking"
        )

        self.student = User.objects.create_user(
            email="student@example.com",
            password="password",
            role=User.Role.STUDENT,
            department=self.dept,
        )
        self.instructor = User.objects.create_user(
            email="instructor@example.com",
            password="password",
            role=User.Role.INSTRUCTOR,
            department=self.dept,
        )
        self.head = User.objects.create_user(
            email="head@example.com",
            password="password",
            role=User.Role.DEPARTMENT_HEAD,
            department=self.dept,
        )

        self.course_template = CourseTemplate.objects.create(
            department=self.dept,
            code="101",
            name="Intro to CS",
            credit=3,
        )
        self.lo1 = LearningOutcome.objects.create(
            course_template=self.course_template,
            code="LO-1",
            description="Understand basic algorithms",
        )

        self.lopo1 = LOtoPOContribution.objects.create(
            learning_outcome=self.lo1,
            program_outcome=self.po1,
            weight=4.0,
        )
        self.lopo1.approve(self.head)

        self.course_instance = CourseInstance.objects.create(
            course_template=self.course_template,
            semester="Fall",
            year=2024,
            instructor=self.instructor,
        )
        self.course_instance.students.add(self.student)

        self.midterm = Assessment.objects.create(
            course_instance=self.course_instance,
            name="Midterm",
            assessment_type=Assessment.AssessmentType.MIDTERM,
            max_score=100,
            weight=100,
        )

        AssessmentToLOContribution.objects.create(
            assessment=self.midterm,
            learning_outcome=self.lo1,
            weight=5.0,
        )

    def test_get_po_scores_for_course_returns_results(self):
        """Test that get_po_scores_for_course calls calculator correctly."""
        AssessmentGrade.objects.create(
            student=self.student,
            assessment=self.midterm,
            score=85,
            entered_by=self.instructor,
        )

        results = self.student.get_po_scores_for_course(self.course_instance)
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['program_outcome'], self.po1)
        self.assertEqual(results[0]['achievement'], 85.00)

    def test_get_po_scores_for_course_non_student_returns_empty(self):
        """Test that non-students get empty list."""
        results = self.instructor.get_po_scores_for_course(self.course_instance)
        self.assertEqual(results, [])
        
        results = self.head.get_po_scores_for_course(self.course_instance)
        self.assertEqual(results, [])

    def test_get_overall_po_scores_returns_results(self):
        """Test that get_overall_po_scores calls calculator correctly."""
        AssessmentGrade.objects.create(
            student=self.student,
            assessment=self.midterm,
            score=90,
            entered_by=self.instructor,
        )

        results = self.student.get_overall_po_scores()
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['program_outcome'], self.po1)
        self.assertEqual(results[0]['overall_achievement'], 90.00)

    def test_get_overall_po_scores_non_student_returns_empty(self):
        """Test that non-students get empty list."""
        results = self.instructor.get_overall_po_scores()
        self.assertEqual(results, [])

    def test_get_overall_po_scores_no_department_returns_empty(self):
        """Test that student without department gets empty list."""
        student_no_dept = User.objects.create_user(
            email="nodept@example.com",
            password="password",
            role=User.Role.STUDENT,
        )
        results = student_no_dept.get_overall_po_scores()
        self.assertEqual(results, [])

    def test_get_po_scores_for_course_no_grades_returns_empty(self):
        """Test that student with no grades gets empty list."""
        results = self.student.get_po_scores_for_course(self.course_instance)
        self.assertEqual(results, [])
