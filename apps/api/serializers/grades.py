from rest_framework import serializers

from apps.grades.models import AssessmentGrade
from apps.courses.models import Assessment
from .courses import AssessmentSerializer


class AssessmentGradeSerializer(serializers.ModelSerializer):
    assessment = AssessmentSerializer(read_only=True)
    assessment_id = serializers.PrimaryKeyRelatedField(
        queryset=Assessment.objects.all(),
        source="assessment",
        write_only=True,
    )

    class Meta:
        model = AssessmentGrade
        fields = [
            "id",
            "student",
            "assessment",
            "assessment_id",
            "score",
            "entered_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "entered_by"]
