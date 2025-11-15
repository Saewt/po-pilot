from rest_framework import serializers
from apps.core.models import Department, ProgramOutcome

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id","name","code","is_active","created_at","updated_at"]
        read_only_fields = ["id","created_at","updated_at"]

class ProgramOutcomeSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True
    )
    get_full_code = serializers.ReadOnlyField()

    class Meta:
        model = ProgramOutcome
        fields = [
            "id",
            "department",
            "department_id",
            "code",
            "description",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
            "get_full_code",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "get_full_code",
        ]