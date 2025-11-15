from rest_framework import serializers

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


class CourseTemplateSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True
    )
    get_full_code = serializers.ReadOnlyField()

    class Meta:
        model = CourseTemplate
        fields = [
            "id",
            "department",
            "department_id",
            "code",
            "name",
            "credit",
            "description",
            "get_full_code",
        ]
        read_only_fields = ["id"]


class CourseInstanceSerializer(serializers.ModelSerializer):
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
            "id",
            "course_template",
            "course_template_id",
            "semester",
            "year",
            "instructor",
            "students",
            "is_active",
            "get_full_code",
        ]
        read_only_fields = ["id"]


class LearningOutcomeSerializer(serializers.ModelSerializer):
    course_template = CourseTemplateSerializer(read_only=True)
    course_template_id = serializers.PrimaryKeyRelatedField(
        queryset=CourseTemplate.objects.all(),
        source="course_template",
        write_only=True,
    )

    class Meta:
        model = LearningOutcome
        fields = [
            "id",
            "course_template",
            "course_template_id",
            "code",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AssessmentSerializer(serializers.ModelSerializer):
    course_instance = CourseInstanceSerializer(read_only=True)
    course_instance_id = serializers.PrimaryKeyRelatedField(
        queryset=CourseInstance.objects.all(),
        source="course_instance",
        write_only=True,
    )

    class Meta:
        model = Assessment
        fields = [
            "id",
            "course_instance",
            "course_instance_id",
            "name",
            "assessment_type",
            "max_score",
            "weight",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AssessmentToLOContributionSerializer(serializers.ModelSerializer):
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
            "id",
            "assessment",
            "assessment_id",
            "learning_outcome",
            "learning_outcome_id",
            "weight",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LOtoPOContributionSerializer(serializers.ModelSerializer):
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
            "id",
            "learning_outcome",
            "learning_outcome_id",
            "program_outcome",
            "program_outcome_id",
            "weight",
            "is_approved",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "approved_by",
            "approved_at",
        ]
