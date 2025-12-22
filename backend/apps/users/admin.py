from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from apps.users.models import User  

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = ("id", "email", "first_name", "last_name", "role", "department", "student_id", "enrollment_year", "get_class_year", "is_staff")
    list_filter = ("role", "department", "is_staff", "is_superuser", "is_active", "must_change_password", "enrollment_year")
    search_fields = ("email", "first_name", "last_name", "student_id")
    readonly_fields = ("get_class_year", "date_joined", "last_login")

    @admin.display(description="Class Year")
    def get_class_year(self, obj):
        return obj.class_year if obj.class_year else "-"

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name", "student_id", "department")}),
        (_("Student Info"), {"fields": ("enrollment_year", "get_class_year", "must_change_password")}),
        (_("Role & Permissions"), {
            "fields": (
                "role",
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            )
        }),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email",
                "password1",
                "password2",
                "first_name",
                "last_name",
                "role",
                "department",
                "student_id",
                "enrollment_year",
                "must_change_password",
                "is_active",
                "is_staff",
                "is_superuser",
            ),
        }),
    )