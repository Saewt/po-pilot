from rest_framework import serializers
from django.utils import timezone
from django.db import models as db_models
from apps.courses.models import (
    CourseTemplate,
    CourseInstance,
    LearningOutcome,
    Assessment,
    AssessmentToLOContribution,
    LOtoPOContribution,
)
from apps.core.models import Department, ProgramOutcome
from .core import DepartmentSimpleSerializer, ProgramOutcomeListSerializer
from apps.api.serializers.users import UserSerializer


# -----------------------------------------------------------------------------
# COURSE TEMPLATE SERIALIZERS
# -----------------------------------------------------------------------------

class CourseTemplateWriteSerializer(serializers.ModelSerializer):
    """Request schema for creating/updating course templates."""
    department_id = serializers.PrimaryKeyRelatedField(
        source="department",
        queryset=Department.objects.all(),
        write_only=True
    )

    class Meta:
        model = CourseTemplate
        fields = ["id", "department_id", "code", "name", "credit", "description", "target_class_year"]
        read_only_fields = ["id"]


class CourseTemplateListSerializer(serializers.ModelSerializer):
    """Response summary for course templates."""
    department = DepartmentSimpleSerializer(read_only=True)
    full_code = serializers.ReadOnlyField(source="get_full_code")

    class Meta:
        model = CourseTemplate
        fields = ["id", "department", "full_code", "name", "credit", "target_class_year"]


class CourseTemplateDetailSerializer(serializers.ModelSerializer):
    """Response detail for course template."""
    department = DepartmentSimpleSerializer(read_only=True)
    full_code = serializers.ReadOnlyField(source="get_full_code")
    learning_outcomes_count = serializers.SerializerMethodField()
    instances_summary = serializers.SerializerMethodField()

    class Meta:
        model = CourseTemplate
        fields = [
            "id", "department", "full_code", "code", "name",
            "credit", "description", "target_class_year",
            "learning_outcomes_count", "instances_summary"
        ]
        read_only_fields = ["id"]

    def get_learning_outcomes_count(self, obj):
        return getattr(obj, "learning_outcomes_count", obj.learning_outcomes.count())

    def get_instances_summary(self, obj):
        total = getattr(obj, "instances_total_count", obj.instances.count())
        active = getattr(obj, "instances_active_count", obj.instances.filter(is_active=True).count())
        return {"total": total, "active": active}


# -----------------------------------------------------------------------------
# LEARNING OUTCOME SERIALIZERS
# -----------------------------------------------------------------------------

class LearningOutcomeWriteSerializer(serializers.ModelSerializer):
    """Request schema for creating/updating LOs."""
    course_template_id = serializers.PrimaryKeyRelatedField(
        source="course_template",
        queryset=CourseTemplate.objects.all(),
        write_only=True
    )

    class Meta:
        model = LearningOutcome
        fields = ["course_template_id", "code", "description"]
        read_only_fields = ["id"]


class LearningOutcomeListSerializer(serializers.ModelSerializer):
    """Response summary for LOs with contribution weights."""
    full_code = serializers.ReadOnlyField(source="get_full_code")
    po_contributions = serializers.SerializerMethodField()
    assessment_contributions = serializers.SerializerMethodField()

    class Meta:
        model = LearningOutcome
        fields = ["id", "full_code", "description", "po_contributions", "assessment_contributions"]

    def get_po_contributions(self, obj):
        """Return LO-PO contribution weights with PO description."""
        contribs = getattr(obj, 'prefetched_po_contributions', obj.po_contributions.all())
        return [
            {
                "id": c.id,
                "program_outcome_id": c.program_outcome_id,
                "program_outcome_code": c.program_outcome.get_full_code() if c.program_outcome else None,
                "program_outcome_description": c.program_outcome.description if c.program_outcome else None,
                "weight": float(c.weight),
                "approval_status": c.approval_status
            }
            for c in contribs
        ]

    def get_assessment_contributions(self, obj):
        """Return Assessment-LO contribution weights, filtered by course_instance if provided."""
        contribs = getattr(obj, 'prefetched_assessment_contributions', obj.assessment_contributions.all())
        
        # Filter by course_instance if provided in context
        course_instance_id = self.context.get('course_instance_id')
        if course_instance_id:
            contribs = [c for c in contribs if c.assessment and c.assessment.course_instance_id == int(course_instance_id)]
        
        return [
            {
                "id": c.id,
                "assessment_id": c.assessment_id,
                "assessment_name": c.assessment.name if c.assessment else None,
                "weight": float(c.weight)
            }
            for c in contribs
        ]


class LearningOutcomeDetailSerializer(serializers.ModelSerializer):
    """Response detail for LO with contributions."""
    full_code = serializers.ReadOnlyField(source="get_full_code")
    course_template = CourseTemplateListSerializer(read_only=True)
    po_contributions = serializers.SerializerMethodField()

    class Meta:
        model = LearningOutcome
        fields = ["id", "full_code", "description", "course_template", "po_contributions"]
        read_only_fields = ["id"]

    def get_po_contributions(self, obj):
        # This will be optimized via prefetch in ViewSet
        return LOtoPOContributionListSerializer(obj.po_contributions.all(), many=True).data


# -----------------------------------------------------------------------------
# COURSE INSTANCE SERIALIZERS
# -----------------------------------------------------------------------------

class CourseInstanceWriteSerializer(serializers.ModelSerializer):
    """Request schema for creating/updating course instances."""
    course_template_id = serializers.PrimaryKeyRelatedField(
        source="course_template",
        queryset=CourseTemplate.objects.all(),
        write_only=True
    )
    instructor_id = serializers.PrimaryKeyRelatedField(
        source="instructor",
        queryset=UserSerializer.Meta.model.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = CourseInstance
        fields = ["id", "course_template_id", "semester", "year", "instructor_id", "is_active", "students"]
        read_only_fields = ["id", "students"]
        extra_kwargs = {
            'students': {'required': False}
        }
    
    def validate(self, data):
        # Ensure validation logic if any. 
        return data


class CourseInstanceListSerializer(serializers.ModelSerializer):
    """Response summary for course instances."""
    full_code = serializers.ReadOnlyField(source="get_full_code")
    course_name = serializers.ReadOnlyField(source="course_template.name")
    target_class_year = serializers.ReadOnlyField(source="course_template.target_class_year")
    instructor = serializers.SerializerMethodField()
    is_finalized = serializers.ReadOnlyField()

    class Meta:
        model = CourseInstance
        fields = ["id", "full_code", "course_name", "target_class_year", "semester", "year", "instructor", "is_active", "is_finalized", "finalized_at"]

    def get_instructor(self, obj):
        if obj.instructor:
            return {"id": obj.instructor.id, "name": f"{obj.instructor.first_name} {obj.instructor.last_name}"}
        return None


class CourseInstanceDetailSerializer(serializers.ModelSerializer):
    """Response detail for course instance."""
    full_code = serializers.ReadOnlyField(source="get_full_code")
    course_template = CourseTemplateListSerializer(read_only=True)
    instructor = UserSerializer(read_only=True)
    students = UserSerializer(many=True, read_only=True)
    students_count = serializers.IntegerField(read_only=True)
    assessments_summary = serializers.SerializerMethodField()
    is_finalized = serializers.ReadOnlyField()
    finalized_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CourseInstance
        fields = [
            "id", "full_code", "semester", "year", 
            "course_template", "instructor", "students", "students_count", 
            "assessments_summary", "is_active", "is_finalized", "finalized_at", "finalized_by_name"
        ]
        read_only_fields = ["id"]

    def get_assessments_summary(self, obj):
        return {
            "count": getattr(obj, "assessments_count", obj.assessments.count()),
        }
    
    def get_finalized_by_name(self, obj):
        if obj.finalized_by:
            return f"{obj.finalized_by.first_name} {obj.finalized_by.last_name}"
        return None


# -----------------------------------------------------------------------------
# ASSESSMENT SERIALIZERS
# -----------------------------------------------------------------------------

class AssessmentWriteSerializer(serializers.ModelSerializer):
    """Request schema for creating/updating assessments."""
    course_instance_id = serializers.PrimaryKeyRelatedField(
        source="course_instance",
        queryset=CourseInstance.objects.all(),
        write_only=True
    )

    class Meta:
        model = Assessment
        fields = ["id", "course_instance_id", "name", "assessment_type", "max_score", "weight", "description"]
        read_only_fields = ["id"]

    def validate(self, data):
        """Validate assessment data including total weight check."""
        weight = data.get('weight')
        course_instance = data.get('course_instance') or (self.instance.course_instance if self.instance else None)
        
        # Ensure single weight is reasonable
        if weight and weight > 100:
            raise serializers.ValidationError({
                "weight": "Weight cannot exceed 100%."
            })
        
        # Ensure total weights don't exceed 100%
        if weight and course_instance:
            existing_total = course_instance.assessments.exclude(
                pk=self.instance.pk if self.instance else None
            ).aggregate(
                total=db_models.Sum('weight')
            )['total'] or 0
            
            new_total = existing_total + weight
            if new_total > 100:
                raise serializers.ValidationError({
                    "weight": f"Total weight would be {new_total}%. Cannot exceed 100%. Current total: {existing_total}%."
                })
        
        return data


class AssessmentListSerializer(serializers.ModelSerializer):
    """Response summary for assessments."""

    class Meta:
        model = Assessment
        fields = ["id", "name", "assessment_type", "max_score", "weight", "description"]


class AssessmentDetailSerializer(serializers.ModelSerializer):
    """Response detail for assessment."""
    course_instance = CourseInstanceListSerializer(read_only=True)
    lo_contributions = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = ["id", "course_instance", "name", "assessment_type", "max_score", "weight", "description", "lo_contributions"]
        read_only_fields = ["id"]

    def get_lo_contributions(self, obj):
        return AssessmentToLOContributionListSerializer(
            getattr(obj, "assessment_lo_contributions", obj.assessment_lo_contributions.all()), many=True
        ).data


# -----------------------------------------------------------------------------
# CONTRIBUTION SERIALIZERS
# -----------------------------------------------------------------------------

class LOtoPOContributionWriteSerializer(serializers.ModelSerializer):
    learning_outcome_id = serializers.PrimaryKeyRelatedField(
        source="learning_outcome", queryset=LearningOutcome.objects.all(), write_only=True
    )
    program_outcome_id = serializers.PrimaryKeyRelatedField(
        source="program_outcome", queryset=ProgramOutcome.objects.all(), write_only=True
    )

    class Meta:
        model = LOtoPOContribution
        fields = ["id", "learning_outcome_id", "program_outcome_id", "weight", "approval_status"]
        read_only_fields = ["id", "approval_status"]

    def validate(self, data):
        learning_outcome = data.get('learning_outcome')
        program_outcome = data.get('program_outcome')
        
        if learning_outcome and program_outcome:
            lo_dept = learning_outcome.course_template.department
            po_dept = program_outcome.department
            
            if lo_dept != po_dept:
                raise serializers.ValidationError({
                    "program_outcome_id": f"Program Outcome must belong to the same department as Learning Outcome ({lo_dept.code})."
                })
        
        return data


class LOtoPOContributionListSerializer(serializers.ModelSerializer):
    learning_outcome = LearningOutcomeListSerializer(read_only=True)
    program_outcome = ProgramOutcomeListSerializer(read_only=True)

    class Meta:
        model = LOtoPOContribution
        fields = ["id", "learning_outcome", "program_outcome", "weight", "approval_status", "approved_at", "decline_reason"]


class LOtoPOContributionDetailSerializer(serializers.ModelSerializer):
    learning_outcome = LearningOutcomeListSerializer(read_only=True)
    program_outcome = ProgramOutcomeListSerializer(read_only=True)
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LOtoPOContribution
        fields = [
            "id", "learning_outcome", "program_outcome", "weight", 
            "approval_status", "approved_by", "approved_by_name", "approved_at",
            "decline_reason", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "approved_by", "approved_at", "created_at", "updated_at"]

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}"
        return None


class AssessmentToLOContributionWriteSerializer(serializers.ModelSerializer):
    assessment_id = serializers.PrimaryKeyRelatedField(
        source="assessment", queryset=Assessment.objects.all(), write_only=True, required=False
    )
    learning_outcome_id = serializers.PrimaryKeyRelatedField(
        source="learning_outcome", queryset=LearningOutcome.objects.all(), write_only=True, required=False
    )

    class Meta:
        model = AssessmentToLOContribution
        fields = ["id", "assessment_id", "learning_outcome_id", "weight"]
        read_only_fields = ["id"]
        # Disable automatic UniqueTogetherValidator - we handle this in validate()
        validators = []
    
    def validate(self, data):
        """
        Custom validation to handle unique_together on updates.
        Only check uniqueness if we're changing to a different assessment/LO combination.
        """
        # Get the values being set (from request or existing instance)
        new_assessment = data.get('assessment')
        new_lo = data.get('learning_outcome')
        
        # For creation, both fields are required
        if not self.instance:
            if not new_assessment:
                raise serializers.ValidationError({"assessment_id": "This field is required."})
            if not new_lo:
                raise serializers.ValidationError({"learning_outcome_id": "This field is required."})
        
        # Get the effective values (new or existing)
        assessment = new_assessment or (self.instance.assessment if self.instance else None)
        learning_outcome = new_lo or (self.instance.learning_outcome if self.instance else None)
        
        # Check for duplicates only if this is a new combination
        if assessment and learning_outcome:
            # For updates: if combination unchanged, skip uniqueness check
            if self.instance:
                current_assessment = self.instance.assessment
                current_lo = self.instance.learning_outcome
                # If not changing the combo, it's fine
                if assessment == current_assessment and learning_outcome == current_lo:
                    return data
            
            # Check if this combination already exists (excluding current instance)
            existing = AssessmentToLOContribution.objects.filter(
                assessment=assessment,
                learning_outcome=learning_outcome
            )
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            
            if existing.exists():
                raise serializers.ValidationError(
                    "This assessment is already linked to this learning outcome."
                )
        
        return data


class AssessmentToLOContributionListSerializer(serializers.ModelSerializer):
    assessment = AssessmentListSerializer(read_only=True)
    learning_outcome = LearningOutcomeListSerializer(read_only=True)

    class Meta:
        model = AssessmentToLOContribution
        fields = ["id", "assessment", "learning_outcome", "weight"]




class CourseLOAchievementSerializer(serializers.Serializer):
    """Learning Outcome achievement statistics for a course instance."""
    learning_outcome = LearningOutcomeListSerializer(read_only=True)
    average = serializers.DecimalField(
        max_digits=5, decimal_places=2, 
        help_text="Average achievement score across all students"
    )
    min = serializers.DecimalField(
        max_digits=5, decimal_places=2,
        help_text="Minimum achievement score"
    )
    max = serializers.DecimalField(
        max_digits=5, decimal_places=2,
        help_text="Maximum achievement score"
    )
    student_count = serializers.IntegerField(
        help_text="Number of students with grades for this LO"
    )


class StudentEnrollmentSerializer(serializers.Serializer):
    """Serializer for bulk student enrollment operations."""
    student_ids = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of Student IDs (e.g. '20205011') to enroll"
    )
    
    def validate_student_ids(self, student_ids):
        """Validate that all IDs are valid students."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Filter by student_id field, NOT db id
        students = User.objects.filter(student_id__in=student_ids, role="STUDENT")
        found_ids = set(students.values_list('student_id', flat=True))
        missing_ids = set(student_ids) - found_ids
        
        if missing_ids:
            raise serializers.ValidationError(
                f"Invalid student IDs: {list(missing_ids)}"
            )
        
        return student_ids


class CourseStudentSerializer(serializers.Serializer):
    """Simple serializer for listing students in a course."""
    id = serializers.IntegerField()
    student_id = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()


class StudentUnenrollSerializer(serializers.Serializer):
    """Serializer for single student unenrollment."""
    student_id = serializers.CharField(help_text="Student ID (e.g. '20205011') to unenroll")
    
    def validate_student_id(self, student_id):
        """Validate that the ID is a valid student."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        if not User.objects.filter(student_id=student_id, role="STUDENT").exists():
            raise serializers.ValidationError(f"Invalid student ID: {student_id}")
        
        return student_id


class LOtoPOApprovalActionSerializer(serializers.Serializer):
    """Serializer for LO-PO approval actions (approve/decline)."""
    action = serializers.ChoiceField(
        choices=["approve", "decline", "reset_to_pending"],
        help_text="Action to perform on the LO-PO contribution"
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Reason for declining (required when action is 'decline')"
    )
    
    def validate(self, data):
        action = data.get('action')
        reason = data.get('reason')
        
        if action == 'decline' and not reason:
            raise serializers.ValidationError({
                'reason': 'Reason is required when declining a contribution.'
            })
        
        return data


class FinalGradeSerializer(serializers.Serializer):
    """Serializer for final course grades."""
    student_id = serializers.IntegerField()
    student_number = serializers.CharField()
    student_name = serializers.CharField()
    total_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    normalized_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    letter_grade = serializers.CharField()
    total_possible_weight = serializers.DecimalField(max_digits=5, decimal_places=2)


class GradeDistributionSerializer(serializers.Serializer):
    """Serializer for grade distribution statistics."""
    total_students = serializers.IntegerField()
    distribution = serializers.DictField(
        child=serializers.IntegerField(),
        help_text="Map of letter grades to count (e.g. {'A': 5, 'B': 3})"
    )
    average_score = serializers.DecimalField(max_digits=5, decimal_places=2)


# -----------------------------------------------------------------------------
# COURSE FINALIZATION SERIALIZERS
# -----------------------------------------------------------------------------

class FinalizeCourseValidationSerializer(serializers.Serializer):
    """Validation response when finalization fails."""
    can_finalize = serializers.BooleanField(
        help_text="Whether the course can be finalized"
    )
    current_weight_total = serializers.DecimalField(
        max_digits=5, decimal_places=2,
        help_text="Current total of assessment weights"
    )
    missing_weight = serializers.DecimalField(
        max_digits=5, decimal_places=2, allow_null=True,
        help_text="Weight needed to reach 100% (if not complete)"
    )
    students_missing_grades = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of students with missing grade info"
    )
    total_students = serializers.IntegerField()
    students_fully_graded = serializers.IntegerField()


class FinalizeCourseResponseSerializer(serializers.Serializer):
    """Response after successful course finalization."""
    message = serializers.CharField()
    finalized_at = serializers.DateTimeField()
    finalized_by = serializers.CharField()
    total_students = serializers.IntegerField()
    grade_distribution = serializers.DictField(
        child=serializers.IntegerField(),
        help_text="Distribution of letter grades"
    )


class AssessmentGradeSummarySerializer(serializers.Serializer):
    """Individual assessment with student's grade for course summary."""
    assessment_id = serializers.IntegerField()
    assessment_name = serializers.CharField()
    assessment_type = serializers.CharField()
    score = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)
    max_score = serializers.DecimalField(max_digits=6, decimal_places=2)
    weight = serializers.DecimalField(max_digits=5, decimal_places=2)
    weighted_score = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)


class LOAchievementSummarySerializer(serializers.Serializer):
    """LO achievement for course summary."""
    lo_id = serializers.IntegerField()
    lo_code = serializers.CharField()
    lo_description = serializers.CharField()
    achievement = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)


class POAchievementSummarySerializer(serializers.Serializer):
    """PO achievement for course summary."""
    po_id = serializers.IntegerField()
    po_code = serializers.CharField()
    po_full_code = serializers.CharField()
    po_description = serializers.CharField()
    achievement = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)


class CourseSummarySerializer(serializers.Serializer):
    """Comprehensive course summary for a student."""
    # Course info
    course_instance_id = serializers.IntegerField()
    course_name = serializers.CharField()
    course_code = serializers.CharField()
    semester = serializers.CharField()
    year = serializers.IntegerField()
    credit = serializers.IntegerField()
    instructor_name = serializers.CharField(allow_null=True)
    is_finalized = serializers.BooleanField()
    finalized_at = serializers.DateTimeField(allow_null=True)
    
    # Grade summary
    final_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    normalized_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    letter_grade = serializers.CharField()
    
    # Detailed breakdown
    assessments = AssessmentGradeSummarySerializer(many=True)
    lo_achievements = LOAchievementSummarySerializer(many=True)
    po_achievements = POAchievementSummarySerializer(many=True)
