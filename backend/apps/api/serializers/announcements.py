from rest_framework import serializers
from apps.courses.models import CourseAnnouncement
from apps.core.models import DepartmentAnnouncement


class CourseAnnouncementSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = CourseAnnouncement
        fields = ["id", "course_instance", "title", "message", "created_by", "created_at", "is_read"]
        read_only_fields = ["id", "created_by", "created_at", "is_read"]

    def get_is_read(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.read_receipts.filter(user=request.user).exists()
        return False


class DepartmentAnnouncementSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = DepartmentAnnouncement
        fields = ["id", "department", "title", "message", "audience", "created_by", "created_at", "is_read"]
        read_only_fields = ["id", "department", "created_by", "created_at", "is_read"]

    def get_is_read(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.read_receipts.filter(user=request.user).exists()
        return False
