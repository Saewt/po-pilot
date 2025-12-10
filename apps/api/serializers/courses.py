from rest_framework import serializers
from django.utils import timezone

from apps.courses.models import (
    CourseTemplate,
    CourseInstance,
    LearningOutcome,
    Assessment,
    AssessmentToLOContribution,
    LOtoPOContribution,
)
from apps.core.models import Department, ProgramOutcome
from .core import DepartmentSerializer, ProgramOutcomeSerializer
from apps.api.serializers.users import UserSerializer


class CourseTemplateSerializer(serializers.ModelSerializer):
    """Standard course template serializer for list views."""
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True
    )
    get_full_code = serializers.ReadOnlyField()

    class Meta:
        model = CourseTemplate
        fields = [
            "id", "department", "department_id", "code", "name",
            "credit", "description", "get_full_code",
        ]
        read_only_fields = ["id"]


class CourseTemplateDetailSerializer(serializers.ModelSerializer):
    """Detailed course template serializer with learning outcomes."""
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True
    )
    get_full_code = serializers.ReadOnlyField()
    learning_outcomes_count = serializers.SerializerMethodField()
    instances_count = serializers.SerializerMethodField()

    class Meta:
        model = CourseTemplate
        fields = [
            "id", "department", "department_id", "code", "name",
            "credit", "description", "get_full_code",
            "learning_outcomes_count", "instances_count",
        ]
        read_only_fields = ["id"]
    
    def get_learning_outcomes_count(self, obj):
        """Get learning outcomes count."""
        return getattr(obj, "learning_outcomes_count", obj.learning_outcomes.count())
    
    def get_instances_count(self, obj):
        """Get course instances count."""
        total = getattr(obj, "instances_total_count", None)
        active = getattr(obj, "instances_active_count", None)
        
        if total is None:
            total = obj.instances.count()
        if active is None:
            active = obj.instances.filter(is_active=True).count()
            
        return {
            "total": total,
            "active": active,
        }


class LearningOutcomeSerializer(serializers.ModelSerializer):
    """Standard learning outcome serializer."""
    course_template = CourseTemplateSerializer(read_only=True)
    course_template_id = serializers.PrimaryKeyRelatedField(
        queryset=CourseTemplate.objects.all(),
        source="course_template",
        write_only=True,
    )

    class Meta:
        model = LearningOutcome
        fields = [
            "id", "course_template", "course_template_id", "code",
            "description", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LearningOutcomeDetailSerializer(serializers.ModelSerializer):
    """Detailed learning outcome serializer with PO contributions."""
    course_template = CourseTemplateSerializer(read_only=True)
    course_template_id = serializers.PrimaryKeyRelatedField(
        queryset=CourseTemplate.objects.all(),
        source="course_template",
        write_only=True,
    )
    po_contributions_count = serializers.SerializerMethodField()
    assessment_contributions_count = serializers.SerializerMethodField()

    class Meta:
        model = LearningOutcome
        fields = [
            "id", "course_template", "course_template_id", "code",
            "description", "created_at", "updated_at",
            "po_contributions_count", "assessment_contributions_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
    
    def get_po_contributions_count(self, obj):
        """Get PO contributions statistics."""
        total = getattr(obj, "po_contributions_total_count", None)
        approved = getattr(obj, "po_contributions_approved_count", None)
        
        if total is None:
            total = obj.po_contributions.count()
        if approved is None:
            approved = obj.po_contributions.filter(is_approved=True).count()
            
        return {
            "total": total,
            "approved": approved,
            "pending": total - approved,
        }
    
    def get_assessment_contributions_count(self, obj):
        """Get assessment contributions count."""
        return getattr(obj, "assessment_contributions_count", obj.assessment_contributions.count())


class CourseInstanceSerializer(serializers.ModelSerializer):
    """Standard course instance serializer."""
    course_template = CourseTemplateSerializer(read_only=True)
    course_template_id = serializers.PrimaryKeyRelatedField(
        queryset=CourseTemplate.objects.all(),
        source="course_template",
        write_only=True,
    )
    get_full_code = serializers.ReadOnlyField()

    class Meta:
        model = CourseInstance
        fields = [
            "id", "course_template", "course_template_id", "semester",
            "year", "instructor", "students", "is_active", "get_full_code",
        ]
        read_only_fields = ["id"]


class CourseInstanceDetailSerializer(serializers.ModelSerializer):
    """Detailed course instance serializer with assessments and enrollment."""
    course_template = CourseTemplateSerializer(read_only=True)
    course_template_id = serializers.PrimaryKeyRelatedField(
        queryset=CourseTemplate.objects.all(),
        source="course_template",
        write_only=True,
    )
    get_full_code = serializers.ReadOnlyField()
    students = UserSerializer(many=True, read_only=True)
    instructor_name = serializers.SerializerMethodField()
    students_count = serializers.SerializerMethodField()
    assessments_count = serializers.SerializerMethodField()

    class Meta:
        model = CourseInstance
        fields = [
            "id", "course_template", "course_template_id", "semester",
            "year", "instructor", "instructor_name", "students", 
            "students_count", "is_active", "get_full_code", "assessments_count",
        ]
        read_only_fields = ["id"]
    
    def get_instructor_name(self, obj):
        """Get instructor's full name."""
        if obj.instructor:
            return f"{obj.instructor.first_name} {obj.instructor.last_name}".strip() or obj.instructor.email
        return None
    
    def get_students_count(self, obj):
        """Get enrolled students count."""
        return getattr(obj, "students_count", obj.students.count())
    
    def get_assessments_count(self, obj):
        """Get assessments count."""
        return getattr(obj, "assessments_count", obj.assessments.count())


class AssessmentSerializer(serializers.ModelSerializer):
    """Standard assessment serializer."""
    course_instance = CourseInstanceSerializer(read_only=True)
    course_instance_id = serializers.PrimaryKeyRelatedField(
        queryset=CourseInstance.objects.all(),
        source="course_instance",
        write_only=True,
    )

    class Meta:
        model = Assessment
        fields = [
            "id", "course_instance", "course_instance_id", "name",
            "assessment_type", "max_score", "weight", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
    
    def validate(self, data):
        """Validate assessment data."""
        # Ensure weight is reasonable
        weight = data.get('weight')
        if weight and weight > 100:
            raise serializers.ValidationError({
                "weight": "Weight cannot exceed 100%."
            })
        return data


class AssessmentDetailSerializer(serializers.ModelSerializer):
    """Detailed assessment serializer with LO contributions and grades."""
    course_instance = CourseInstanceSerializer(read_only=True)
    course_instance_id = serializers.PrimaryKeyRelatedField(
        queryset=CourseInstance.objects.all(),
        source="course_instance",
        write_only=True,
    )
    lo_contributions_count = serializers.SerializerMethodField()
    grades_count = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            "id", "course_instance", "course_instance_id", "name",
            "assessment_type", "max_score", "weight", "created_at", "updated_at",
            "lo_contributions_count", "grades_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
    
    def get_lo_contributions_count(self, obj):
        """Get LO contributions count."""
        return getattr(obj, "lo_contributions_count", obj.lo_contributions.count())
    
    def get_grades_count(self, obj):
        """Get grades count."""
        return getattr(obj, "grades_count", obj.grades.count())


class AssessmentToLOContributionSerializer(serializers.ModelSerializer):
    """Standard assessment to LO contribution serializer."""
    assessment = AssessmentSerializer(read_only=True)
    assessment_id = serializers.PrimaryKeyRelatedField(
        queryset=Assessment.objects.all(),
        source="assessment",
        write_only=True,
    )
    learning_outcome = LearningOutcomeSerializer(read_only=True)
    learning_outcome_id = serializers.PrimaryKeyRelatedField(
        queryset=LearningOutcome.objects.all(),
        source="learning_outcome",
        write_only=True,
    )

    class Meta:
        model = AssessmentToLOContribution
        fields = [
            "id", "assessment", "assessment_id", "learning_outcome",
            "learning_outcome_id", "weight", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
    
    def validate(self, data):
        """Validate that LO belongs to the same course template as assessment."""
        learning_outcome = data.get('learning_outcome')
        assessment = data.get('assessment')
        
        if learning_outcome and assessment:
            if learning_outcome.course_template != assessment.course_instance.course_template:
                raise serializers.ValidationError({
                    "learning_outcome": "Learning Outcome must belong to the same course as the Assessment."
                })
        return data


class LOtoPOContributionSerializer(serializers.ModelSerializer):
    """Standard LO to PO contribution serializer."""
    learning_outcome = LearningOutcomeSerializer(read_only=True)
    learning_outcome_id = serializers.PrimaryKeyRelatedField(
        queryset=LearningOutcome.objects.all(),
        source="learning_outcome",
        write_only=True,
    )
    program_outcome = ProgramOutcomeSerializer(read_only=True)
    program_outcome_id = serializers.PrimaryKeyRelatedField(
        queryset=ProgramOutcome.objects.all(),
        source="program_outcome",
        write_only=True,
    )

    class Meta:
        model = LOtoPOContribution
        fields = [
            "id", "learning_outcome", "learning_outcome_id",
            "program_outcome", "program_outcome_id", "weight",
            "is_approved", "approved_by", "approved_at",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "created_at", "updated_at", "approved_by", "approved_at",
        ]
    
    def validate(self, data):
        """Validate that PO belongs to the same department as LO."""
        learning_outcome = data.get('learning_outcome')
        program_outcome = data.get('program_outcome')
        
        if learning_outcome and program_outcome:
            if learning_outcome.course_template.department != program_outcome.department:
                raise serializers.ValidationError({
                    "program_outcome": "Program Outcome must belong to the same department as the Learning Outcome."
                })
        return data


class LOtoPOContributionDetailSerializer(serializers.ModelSerializer):
    """Detailed LO to PO contribution serializer with approval workflow data."""
    learning_outcome = LearningOutcomeSerializer(read_only=True)
    learning_outcome_id = serializers.PrimaryKeyRelatedField(
        queryset=LearningOutcome.objects.all(),
        source="learning_outcome",
        write_only=True,
    )
    program_outcome = ProgramOutcomeSerializer(read_only=True)
    program_outcome_id = serializers.PrimaryKeyRelatedField(
        queryset=ProgramOutcome.objects.all(),
        source="program_outcome",
        write_only=True,
    )
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LOtoPOContribution
        fields = [
            "id", "learning_outcome", "learning_outcome_id",
            "program_outcome", "program_outcome_id", "weight",
            "is_approved", "approved_by", "approved_by_name", "approved_at",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "created_at", "updated_at", "approved_by", "approved_at",
        ]
    
    def get_approved_by_name(self, obj):
        """Get approver's full name."""
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip() or obj.approved_by.email
        return None

