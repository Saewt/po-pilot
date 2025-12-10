from rest_framework import serializers

from django.contrib.auth import get_user_model
from apps.grades.models import AssessmentGrade
from apps.courses.models import Assessment
from .courses import AssessmentSerializer
from apps.api.serializers.users import UserSerializer

User = get_user_model()


class AssessmentGradeSerializer(serializers.ModelSerializer):
    """Standard assessment grade serializer."""
    assessment = AssessmentSerializer(read_only=True)
    assessment_id = serializers.PrimaryKeyRelatedField(
        queryset=Assessment.objects.all(),
        source="assessment",
        write_only=True,
    )
    student = UserSerializer(read_only=True)
    student_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="STUDENT"),
        source="student",
        write_only=True,
    )

    class Meta:
        model = AssessmentGrade
        fields = [
            "id", "student", "student_id", "assessment", "assessment_id",
            "score", "entered_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "entered_by"]
    
    def validate(self, data):
        """Validate grade data."""
        score = data.get('score')
        assessment = data.get('assessment')
        student = data.get('student')
        
        # Validate score against max_score
        if assessment and score and score > assessment.max_score:
            raise serializers.ValidationError({
                "score": f"Score cannot exceed maximum score of {assessment.max_score} for this assessment."
            })
        
        # Validate student is enrolled in the course
        if assessment and student:
            if not assessment.course_instance.students.filter(id=student.id).exists():
                raise serializers.ValidationError({
                    "student": "Student is not enrolled in this course."
                })
        
        return data


class AssessmentGradeDetailSerializer(serializers.ModelSerializer):
    """Detailed assessment grade serializer with LO/PO contribution calculations."""
    assessment = AssessmentSerializer(read_only=True)
    assessment_id = serializers.PrimaryKeyRelatedField(
        queryset=Assessment.objects.all(),
        source="assessment",
        write_only=True,
    )
    student_name = serializers.SerializerMethodField()
    entered_by_name = serializers.SerializerMethodField()
    percentage = serializers.SerializerMethodField()
    weighted_score = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentGrade
        fields = [
            "id", "student", "student_name", "assessment", "assessment_id",
            "score", "percentage", "weighted_score", "entered_by", 
            "entered_by_name", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "entered_by"]
    
    def get_student_name(self, obj):
        """Get student's full name."""
        return f"{obj.student.first_name} {obj.student.last_name}".strip() or obj.student.email
    
    def get_entered_by_name(self, obj):
        """Get grade entry person's name."""
        if obj.entered_by:
            return f"{obj.entered_by.first_name} {obj.entered_by.last_name}".strip() or obj.entered_by.email
        return None
    
    def get_percentage(self, obj):
        """Calculate percentage score."""
        if obj.assessment.max_score > 0:
            return round((obj.score / obj.assessment.max_score) * 100, 2)
        return 0
    
    def get_weighted_score(self, obj):
        """Calculate weighted contribution to final grade."""
        percentage = self.get_percentage(obj)
        return round((percentage * obj.assessment.weight) / 100, 2)


class StudentGradeReportSerializer(serializers.Serializer):
    """Serializer for comprehensive student grade reports per course."""
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    student_email = serializers.EmailField()
    course_instance_id = serializers.IntegerField()
    course_name = serializers.CharField()
    course_code = serializers.CharField()
    semester = serializers.CharField()
    year = serializers.IntegerField()
    grades = AssessmentGradeDetailSerializer(many=True)
    total_weighted_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    assessment_count = serializers.IntegerField()
    graded_count = serializers.IntegerField()

