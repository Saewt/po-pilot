from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models


# Create your models here.
class User(AbstractUser):
    class Role(models.TextChoices):
        DEPARTMENT_HEAD = "DEPARTMENT_HEAD", "Department Head"
        INSTRUCTOR = "INSTRUCTOR", "Instructor"
        STUDENT = "STUDENT", "Student"

    role = models.CharField(
        "Role", max_length=20, choices=Role.choices, default=Role.STUDENT, db_index=True
    )
    department = models.ForeignKey(
        "core.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Department",
        related_name="members",
    )
    student_id = models.CharField(
        "Student ID",
        max_length=9,
        blank=True,
        null=True,
        unique=True,
        validators=[  #
            RegexValidator(
                regex=r"^\d+$",
                message="Student ID must be a number.",
                code="invalid_student_id",
            )
        ],
        help_text="Only for students",
    )
