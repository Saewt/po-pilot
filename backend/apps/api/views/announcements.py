from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from apps.courses.models import CourseAnnouncement, CourseAnnouncementReadReceipt
from apps.core.models import DepartmentAnnouncement, DepartmentAnnouncementReadReceipt
from apps.api.serializers.announcements import (
    CourseAnnouncementSerializer,
    DepartmentAnnouncementSerializer,
)


class CourseAnnouncementViewSet(viewsets.ModelViewSet):
    """ViewSet for course-level announcements by instructors."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourseAnnouncementSerializer

    def get_queryset(self):
        user = self.request.user
        qs = CourseAnnouncement.objects.select_related(
            "course_instance", "course_instance__course_template", "created_by"
        ).prefetch_related("read_receipts")

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

    @action(detail=True, methods=["patch"], url_path="mark-as-read")
    def mark_as_read(self, request, pk=None):
        """Mark a single course announcement as read."""
        announcement = self.get_object()
        CourseAnnouncementReadReceipt.objects.get_or_create(
            announcement=announcement, user=request.user
        )
        return Response({"status": "marked as read"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["patch"], url_path="mark-all-read")
    def mark_all_read(self, request):
        """Mark all course announcements as read for the current user."""
        announcements = self.get_queryset()
        created_count = 0
        for announcement in announcements:
            _, created = CourseAnnouncementReadReceipt.objects.get_or_create(
                announcement=announcement, user=request.user
            )
            if created:
                created_count += 1
        return Response({"marked_read": created_count})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """Get count of unread course announcements."""
        total = self.get_queryset().count()
        read = self.get_queryset().filter(read_receipts__user=request.user).count()
        return Response({"unread_count": total - read})


class DepartmentAnnouncementViewSet(viewsets.ModelViewSet):
    """ViewSet for department-wide announcements by department heads."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DepartmentAnnouncementSerializer

    def get_queryset(self):
        user = self.request.user
        qs = DepartmentAnnouncement.objects.select_related(
            "department", "created_by"
        ).prefetch_related("read_receipts")

        if user.is_student():
            return qs.filter(
                department=user.department,
                audience__in=['STUDENTS', 'ALL']
            )

        if user.is_department_head():
            try:
                return qs.filter(department=user.headed_department)
            except Exception:
                return qs.none()

        # Instructors see announcements from their department based on audience
        if user.is_instructor():
            return qs.filter(
                department=user.department,
                audience__in=['INSTRUCTORS', 'ALL']
            )

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

    @action(detail=True, methods=["patch"], url_path="mark-as-read")
    def mark_as_read(self, request, pk=None):
        """Mark a single department announcement as read."""
        announcement = self.get_object()
        DepartmentAnnouncementReadReceipt.objects.get_or_create(
            announcement=announcement, user=request.user
        )
        return Response({"status": "marked as read"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["patch"], url_path="mark-all-read")
    def mark_all_read(self, request):
        """Mark all department announcements as read for the current user."""
        announcements = self.get_queryset()
        created_count = 0
        for announcement in announcements:
            _, created = DepartmentAnnouncementReadReceipt.objects.get_or_create(
                announcement=announcement, user=request.user
            )
            if created:
                created_count += 1
        return Response({"marked_read": created_count})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """Get count of unread department announcements."""
        total = self.get_queryset().count()
        read = self.get_queryset().filter(read_receipts__user=request.user).count()
        return Response({"unread_count": total - read})
