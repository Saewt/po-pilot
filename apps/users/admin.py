from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from apps.users.models import User  

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "role", "department", "is_staff")
    list_filter = ("role", "department", "is_staff", "is_superuser", "is_active")
    search_fields = ("email", "first_name", "last_name", "student_id")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name", "student_id", "department")}),
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
                "role",
                "department",
                "student_id",
                "is_active",
                "is_staff",
                "is_superuser",
            ),
        }),
    )
