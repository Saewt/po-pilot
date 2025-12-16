"""
Serializers for achievement calculations and reporting.
Integrates with the AchievementCalculator from apps.grades.calculators.
"""
from rest_framework import serializers
from apps.users.models import User
from apps.courses.models import CourseInstance
from apps.core.models import ProgramOutcome


class POAchievementSerializer(serializers.Serializer):
    """Serializer for individual Program Outcome achievement scores."""
    po_id = serializers.IntegerField()
    po_code = serializers.CharField()
    po_full_code = serializers.CharField()
    po_description = serializers.CharField()
    achievement_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    contribution_count = serializers.IntegerField()
    max_possible_score = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    
    def to_representation(self, instance):
        """Convert achievement calculator output to JSON."""
        return {
            "po_id": instance.get("po_id"),
            "po_code": instance.get("po_code"),
            "po_full_code": instance.get("po_full_code"),
            "po_description": instance.get("po_description", ""),
            "achievement_score": round(instance.get("achievement_score", 0), 2),
            "contribution_count": instance.get("contribution_count", 0),
            "max_possible_score": round(instance.get("max_possible_score", 0), 2) if instance.get("max_possible_score") else None,
        }


class CourseAchievementSerializer(serializers.Serializer):
    """Serializer for course-specific PO achievements."""
    course_instance_id = serializers.IntegerField()
    course_name = serializers.CharField()
    course_code = serializers.CharField()
    semester = serializers.CharField()
    year = serializers.IntegerField()
    instructor_name = serializers.CharField(required=False, allow_null=True)
    po_achievements = POAchievementSerializer(many=True)
    overall_achievement = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)


class StudentOverallReportSerializer(serializers.Serializer):
    """Comprehensive student achievement report across all courses."""
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    student_email = serializers.EmailField()
    student_number = serializers.CharField()
    department_name = serializers.CharField()
    department_code = serializers.CharField()
    
    # Overall PO achievements across all courses
    overall_po_achievements = POAchievementSerializer(many=True)
    
    # Course-specific achievements
    course_achievements = CourseAchievementSerializer(many=True)
    
    # Summary statistics
    total_courses = serializers.IntegerField()
    active_courses = serializers.IntegerField()
    total_assessments = serializers.IntegerField()
    graded_assessments = serializers.IntegerField()
    average_achievement = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)


class DepartmentStatisticsSerializer(serializers.Serializer):
    """Department-level statistics and reporting."""
    department_id = serializers.IntegerField()
    department_name = serializers.CharField()
    department_code = serializers.CharField()
    
    # Department composition
    total_students = serializers.IntegerField()
    total_instructors = serializers.IntegerField()
    total_department_heads = serializers.IntegerField()
    
    # Course statistics
    total_course_templates = serializers.IntegerField()
    active_course_instances = serializers.IntegerField()
    
    # Program outcomes
    total_program_outcomes = serializers.IntegerField()
    active_program_outcomes = serializers.IntegerField()
    
    # Achievement statistics
    average_student_achievement = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    po_achievement_distribution = serializers.DictField(required=False)
    
    # Top/bottom performing POs
    top_performing_pos = POAchievementSerializer(many=True, required=False)
    needs_improvement_pos = POAchievementSerializer(many=True, required=False)


class LOContributionAnalysisSerializer(serializers.Serializer):
    """Analysis of Learning Outcome contributions to Program Outcomes."""
    lo_id = serializers.IntegerField()
    lo_code = serializers.CharField()
    lo_description = serializers.CharField()
    course_code = serializers.CharField()
    course_name = serializers.CharField()
    
    # PO contributions
    po_contributions = serializers.ListField(
        child=serializers.DictField()
    )
    
    # Approval status
    total_contributions = serializers.IntegerField()
    approved_contributions = serializers.IntegerField()
    pending_contributions = serializers.IntegerField()
    
    # Assessment linkage
    linked_assessments_count = serializers.IntegerField()


class AssessmentImpactAnalysisSerializer(serializers.Serializer):
    """Analysis of assessment impact on PO achievements."""
    assessment_id = serializers.IntegerField()
    assessment_name = serializers.CharField()
    assessment_type = serializers.CharField()
    course_name = serializers.CharField()
    course_code = serializers.CharField()
    
    # Assessment details
    max_score = serializers.DecimalField(max_digits=6, decimal_places=2)
    weight = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # Contribution analysis
    lo_contributions_count = serializers.IntegerField()
    affected_pos_count = serializers.IntegerField()
    
    # Grade statistics
    total_students = serializers.IntegerField()
    graded_students = serializers.IntegerField()
    average_score = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    average_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    
    # Impact on PO achievements
    po_impact = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )
