from rest_framework import viewsets, permissions
from apps.courses.models import CourseAnnouncement
from apps.core.models import DepartmentAnnouncement
from apps.api.serializers.announcements import (
    CourseAnnouncementSerializer,
    DepartmentAnnouncementSerializer,
)
from rest_framework.exceptions import PermissionDenied


class CourseAnnouncementViewSet(viewsets.ModelViewSet):
    """ViewSet for course-level announcements by instructors."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourseAnnouncementSerializer

    def get_queryset(self):
        user = self.request.user
        qs = CourseAnnouncement.objects.select_related(
            "course_instance", "course_instance__course_template", "created_by"
        )

        if user.is_student():
            return qs.filter(course_instance__students=user)

        if user.is_instructor():
            return qs.filter(course_instance__instructor=user)

        if user.is_department_head():
            # Department heads see all announcements in their department
            try:
                dept = user.headed_department
                return qs.filter(course_instance__course_template__department=dept)
            except Exception:
                return qs.none()

        return qs

    def create(self, request, *args, **kwargs):
        if request.user.is_student():
            raise PermissionDenied("Students cannot create announcements.")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        course_instance = serializer.validated_data.get("course_instance")

        # Check permission: instructor must teach the course, or be department head
        if user.is_instructor():
            if course_instance.instructor != user:
                raise PermissionDenied("You can only post announcements to your own courses.")
        elif user.is_department_head():
            try:
                dept = user.headed_department
                if course_instance.course_template.department != dept:
                    raise PermissionDenied("You can only post announcements to courses in your department.")
            except Exception:
                raise PermissionDenied("You are not assigned as a department head.")

        serializer.save(created_by=user)


class DepartmentAnnouncementViewSet(viewsets.ModelViewSet):
    """ViewSet for department-wide announcements by department heads."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DepartmentAnnouncementSerializer

    def get_queryset(self):
        user = self.request.user
        qs = DepartmentAnnouncement.objects.select_related("department", "created_by")

        if user.is_student():
            return qs.filter(department=user.department)

        if user.is_department_head():
            try:
                return qs.filter(department=user.headed_department)
            except Exception:
                return qs.none()

        # Instructors see announcements from their department
        if user.is_instructor():
            return qs.filter(department=user.department)

        return qs.none()

    def create(self, request, *args, **kwargs):
        if not request.user.is_department_head():
            raise PermissionDenied("Only department heads can create department announcements.")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        try:
            dept = user.headed_department
        except Exception:
            raise PermissionDenied("You are not assigned as a department head.")

        serializer.save(created_by=user, department=dept)
