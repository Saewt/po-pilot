# apps/core/admin.py
from django.contrib import admin
from .models import Department, ProgramOutcome


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("code", "name")
    ordering = ("code",)


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
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
