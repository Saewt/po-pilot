from rest_framework import serializers
from apps.courses.models import CourseAnnouncement
from apps.core.models import DepartmentAnnouncement


class CourseAnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseAnnouncement
        fields = ["id", "course_instance", "title", "message", "created_by", "created_at"]
        read_only_fields = ["id", "created_by", "created_at"]


class DepartmentAnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepartmentAnnouncement
        fields = ["id", "department", "title", "message", "audience", "created_by", "created_at"]
        read_only_fields = ["id", "department", "created_by", "created_at"]
