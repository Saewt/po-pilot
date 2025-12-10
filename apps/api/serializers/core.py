from rest_framework import serializers
from apps.core.models import Department, ProgramOutcome
from django.contrib.auth import get_user_model

User = get_user_model()


class DepartmentSerializer(serializers.ModelSerializer):
    """Lightweight department serializer for list views."""
    
    class Meta:
        model = Department
        fields = ["id", "name", "code", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class DepartmentDetailSerializer(serializers.ModelSerializer):
    """Detailed department serializer with nested program outcomes."""
    program_outcomes_count = serializers.SerializerMethodField()
    active_program_outcomes_count = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()
    course_templates_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = [
            "id", "name", "code", "is_active", "created_at", "updated_at",
            "program_outcomes_count", "active_program_outcomes_count",
            "members_count", "course_templates_count"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
    
    def get_program_outcomes_count(self, obj):
        """Get total program outcomes count."""
        return getattr(obj, "program_outcomes_count", obj.program_outcomes.count())
    
    def get_active_program_outcomes_count(self, obj):
        """Get active program outcomes count."""
        return getattr(obj, "active_program_outcomes_count", obj.program_outcomes.filter(is_active=True).count())
    
    def get_members_count(self, obj):
        """Get department members count by role."""
        students = getattr(obj, "members_student_count", None)
        instructors = getattr(obj, "members_instructor_count", None)
        heads = getattr(obj, "members_head_count", None)
        
        if students is None:
            students = obj.members.filter(role="STUDENT").count()
        if instructors is None:
            instructors = obj.members.filter(role="INSTRUCTOR").count()
        if heads is None:
            heads = obj.members.filter(role="DEPARTMENT_HEAD").count()
            
        return {
            "students": students,
            "instructors": instructors,
            "department_heads": heads,
        }
    
    def get_course_templates_count(self, obj):
        """Get course templates count."""
        return getattr(obj, "course_templates_count", obj.course_templates.count())


class ProgramOutcomeSerializer(serializers.ModelSerializer):
    """Standard program outcome serializer."""
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True
    )
    get_full_code = serializers.ReadOnlyField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ProgramOutcome
        fields = [
            "id", "department", "department_id", "code", "description",
            "is_active", "created_by", "created_by_name", "created_at",
            "updated_at", "get_full_code",
        ]
        read_only_fields = [
            "id", "created_at", "updated_at", "created_by", "get_full_code",
        ]
    
    def get_created_by_name(self, obj):
        """Get creator's full name."""
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None
    
    def validate(self, data):
        """Validate program outcome data."""
        # Check if department is active
        department = data.get('department')
        if department and not department.is_active:
            raise serializers.ValidationError({
                "department": "Cannot create program outcome for inactive department."
            })
        return data


class ProgramOutcomeDetailSerializer(serializers.ModelSerializer):
    """Detailed program outcome serializer with contribution data."""
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True
    )
    get_full_code = serializers.ReadOnlyField()
    created_by_name = serializers.SerializerMethodField()
    lo_contributions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProgramOutcome
        fields = [
            "id", "department", "department_id", "code", "description",
            "is_active", "created_by", "created_by_name", "created_at",
            "updated_at", "get_full_code", "lo_contributions_count",
        ]
        read_only_fields = [
            "id", "created_at", "updated_at", "created_by", "get_full_code",
        ]
    
    def get_created_by_name(self, obj):
        """Get creator's full name."""
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None
    
    def get_lo_contributions_count(self, obj):
        """Get learning outcome contributions count."""
        total = getattr(obj, "lo_contributions_total_count", None)
        approved = getattr(obj, "lo_contributions_approved_count", None)
        
        if total is None:
            total = obj.lo_contributions.count()
        if approved is None:
            approved = obj.lo_contributions.filter(is_approved=True).count()
            
        return {
            "total": total,
            "approved": approved,
            "pending": total - approved,
        }