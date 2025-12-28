from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer
from rest_framework.exceptions import PermissionDenied

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)
        
        # Filter by is_read
        is_read = self.request.query_params.get("is_read")
        if is_read in ("true", "false"):
            qs = qs.filter(is_read=(is_read == "true"))
            
        # Filter by notification_type
        notification_type = self.request.query_params.get("notification_type")
        if notification_type:
            qs = qs.filter(notification_type=notification_type)
            
        return qs

    @action(detail=True, methods=["patch"], url_path="mark-as-read")
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.save()
        return Response({"status": "marked as read"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["patch"], url_path="mark-all-read")
    def mark_all_read(self, request):
        updated = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({"marked_read": updated})

    def perform_create(self, serializer):
        if self.request.user.is_student():
            raise PermissionDenied("Students cannot create announcements.")
        serializer.save(created_by=self.request.user)
