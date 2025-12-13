from rest_framework import serializers
from apps.core.models import Department, ProgramOutcome
from django.contrib.auth import get_user_model

User = get_user_model()


# -----------------------------------------------------------------------------
# DEPARTMENT SERIALIZERS
# -----------------------------------------------------------------------------

class DepartmentWriteSerializer(serializers.ModelSerializer):
    """Request schema for creating/updating departments."""
    
    class Meta:
        model = Department
        fields = ["id", "name", "code", "is_active"]
        read_only_fields = ["id"]


class DepartmentListSerializer(serializers.ModelSerializer):
    """Response summary for department lists."""
    member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Department
        fields = ["id", "name", "code", "member_count"]


class DepartmentSimpleSerializer(serializers.ModelSerializer):
    """Simple nested serializer for other resources."""
    
    class Meta:
        model = Department
        fields = ["id", "name", "code"]


class DepartmentDetailSerializer(serializers.ModelSerializer):
    """Response detail for single department."""
    members_count = serializers.SerializerMethodField()
    program_outcomes_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = [
            "id", "name", "code", "is_active", "created_at", "updated_at",
            "members_count", "program_outcomes_count"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_members_count(self, obj):
        """Get department members count by role."""
        return {
            "students": getattr(obj, "members_student_count", obj.members.filter(role="STUDENT").count()),
            "instructors": getattr(obj, "members_instructor_count", obj.members.filter(role="INSTRUCTOR").count()),
            "department_heads": getattr(obj, "members_head_count", obj.members.filter(role="DEPARTMENT_HEAD").count()),
        }

    def get_program_outcomes_count(self, obj):
        """Get total and active program outcomes count."""
        total = getattr(obj, "program_outcomes_count", obj.program_outcomes.count())
        active = getattr(obj, "active_program_outcomes_count", obj.program_outcomes.filter(is_active=True).count())
        return {
            "total": total,
            "active": active
        }


# -----------------------------------------------------------------------------
# PROGRAM OUTCOME SERIALIZERS
# -----------------------------------------------------------------------------

class ProgramOutcomeWriteSerializer(serializers.ModelSerializer):
    """Request schema for creating/updating POs."""
    department_id = serializers.PrimaryKeyRelatedField(
        source="department",
        queryset=Department.objects.all(),
        write_only=True
    )

    class Meta:
        model = ProgramOutcome
        fields = ["id", "department_id", "code", "description", "is_active"]
        read_only_fields = ["id"]


class ProgramOutcomeListSerializer(serializers.ModelSerializer):
    """Response summary for PO lists."""
    full_code = serializers.ReadOnlyField(source="get_full_code")

    class Meta:
        model = ProgramOutcome
        fields = ["id", "full_code", "description", "is_active"]


class ProgramOutcomeDetailSerializer(serializers.ModelSerializer):
    """Response detail for PO with metadata."""
    full_code = serializers.ReadOnlyField(source="get_full_code")
    department = DepartmentSimpleSerializer(read_only=True)
    created_by_name = serializers.SerializerMethodField()
    lo_contributions_count = serializers.SerializerMethodField()

    class Meta:
        model = ProgramOutcome
        fields = [
            "id", "full_code", "description", "is_active", 
            "created_at", "updated_at", "department", 
            "created_by_name", "lo_contributions_count"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None

    def get_lo_contributions_count(self, obj):
        total = getattr(obj, "lo_contributions_total_count", obj.lo_contributions.count())
        approved = getattr(obj, "lo_contributions_approved_count", obj.lo_contributions.filter(is_approved=True).count())
        
        return {
            "total": total,
            "approved": approved,
            "pending": total - approved,
        }


class ProgramOutcomeLOSummarySerializer(serializers.ModelSerializer):
    """Response for LO Summary action with detailed contribution info."""
    contributions = serializers.SerializerMethodField()
    
    class Meta:
        model = ProgramOutcome
        fields = ["id", "code", "description", "contributions"]

    def get_contributions(self, obj):
        # Using select_related/prefetch_related to optimize access
        contributions = obj.lo_contributions.select_related('learning_outcome', 'approved_by').all()
        return [
            {
                "id": c.id,
                "learning_outcome": {
                    "id": c.learning_outcome.id,
                    "code": c.learning_outcome.code,
                    "full_code": c.learning_outcome.get_full_code(),
                    "description": c.learning_outcome.description
                },
                "weight": c.weight,
                "is_approved": c.is_approved,
                "approved_by": f"{c.approved_by.first_name} {c.approved_by.last_name}" if c.approved_by else None,
                "status": "Approved" if c.is_approved else ("Rejected" if c.approved_by else "Pending") 
            }
            for c in contributions
        ]