# apps/core/admin.py
from django.contrib import admin
from .models import Department, ProgramOutcome, DepartmentAnnouncement


@admin.register(DepartmentAnnouncement)
class DepartmentAnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "department", "audience", "created_by", "created_at")
    list_filter = ("department", "audience", "created_at")
    search_fields = ("title", "message")
    ordering = ("-created_at",)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name", "head", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("code", "name")
    ordering = ("id",)


@admin.register(ProgramOutcome)
class ProgramOutcomeAdmin(admin.ModelAdmin):
    list_display = (
        "get_full_code",
        "department",
        "description",
        "is_active",
        "created_by",
    )
    list_filter = ("is_active", "department")
    search_fields = ("code", "description", "department__name")

    def save_model(self, request, obj, form, change):
        if not obj.pk and not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
