from rest_framework import viewsets, permissions
from apps.courses.models import CourseAnnouncement
from apps.api.serializers.announcements import CourseAnnouncementSerializer
from rest_framework.exceptions import PermissionDenied

class CourseAnnouncementViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourseAnnouncementSerializer

    def get_queryset(self):
        user = self.request.user
        qs = CourseAnnouncement.objects.all()

        if user.is_student():
            return qs.filter(course_instance__students=user)

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_create(self, serializer):
        if self.request.user.is_student():
            raise PermissionDenied("Students cannot create announcements.")
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        if request.user.is_student():
            raise PermissionDenied("Students cannot create announcements.")
        return super().create(request, *args, **kwargs)
