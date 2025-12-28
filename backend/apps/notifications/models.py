from django.conf import settings
from django.db import models

class Notification(models.Model):
    class Type(models.TextChoices):
        GRADE_POSTED = "GRADE_POSTED", "Grade Posted"
        COURSE_ENROLLED = "COURSE_ENROLLED", "Course Enrolled"
        GENERAL = "GENERAL", "General"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=30, choices=Type.choices, db_index=True)
    title = models.CharField(max_length=120)
    message = models.TextField()

    related_object_type = models.CharField(max_length=64, blank=True, null=True)
    related_object_id = models.CharField(max_length=64, blank=True, null=True)

    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.recipient} - {self.title}"

