from decimal import Decimal
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models
from apps.courses.models import Course
from apps.grades.calculators import AchievementCalculator

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
    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

        def __str__(self):
            return f"{self.username} ({self.get_role_display()})"

    def is_department_head(self):
        return self.role == self.Role.DEPARTMENT_HEAD
    def is_instructor(self):
        return self.role == self.Role.INSTRUCTOR
    def is_student(self):
        return self.role == self.Role.STUDENT
    
    def get_active_enrolled_courses(self):
        if not self.is_student():
            return Course.objects.none()
        return self.enrolled_courses.filter(is_active=True)
    def get_overall_po_scores(self):
        if self.is_student():
            return AchievementCalculator.calculate_student_overall_po_achievements(self)
        return []
    def get_po_scores_for_course(self, course):
        if self.is_student():
            return AchievementCalculator.calculate_all_po_achievements_for_course(self, course)
        return []
    @property
    def performance_score(self):
        if not self.is_student():
            return None
        grades = self.assessment_grades.all()
        if not grades.exists():
            return None
        total_score = Decimal(0)
        for grade in grades:
            total_score += grade.score
            average_score = total_score / grades.count()
        return round(float(average_score), 2)