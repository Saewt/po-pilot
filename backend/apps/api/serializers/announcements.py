from rest_framework import serializers
from apps.courses.models import CourseAnnouncement

class CourseAnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseAnnouncement
        fields = ["id", "course_instance", "title", "message", "created_by", "created_at"]
        read_only_fields = ["id", "created_by", "created_at"]
