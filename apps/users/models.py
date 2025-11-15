from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models
from decimal import Decimal
from apps.courses.models import CourseInstance


# Create your models here.
class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("The Email must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None
    email = models.EmailField("Email address", unique=True)
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
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
 
    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    def is_department_head(self):
        return self.role == self.Role.DEPARTMENT_HEAD
    def is_instructor(self):
        return self.role == self.Role.INSTRUCTOR
    def is_student(self):
        return self.role == self.Role.STUDENT
    
    def get_active_enrolled_courses(self):
        if not self.is_student():
            return CourseInstance.objects.none()
        return self.enrolled_courses.filter(is_active=True)
    def get_overall_po_scores(self):
        from apps.grades.calculators import AchievementCalculator
        if self.is_student():
            return AchievementCalculator.calculate_student_overall_po_achievements(self)
        return []
    def get_po_scores_for_course(self, course_instance):
        from apps.grades.calculators import AchievementCalculator
        if self.is_student():
            return AchievementCalculator.calculate_all_po_achievements_for_course(self, course_instance)
        return []