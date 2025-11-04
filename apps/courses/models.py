from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone
from django.db.models import Q

from apps.core.models import Department


# Create your models here.
class Course(models.Model):
    department = models.ForeignKey(
        "core.Department", on_delete=models.CASCADE, related_name="courses"
    )
    code = models.CharField(max_length=10, help_text="The course code")
    name = models.CharField(max_length=100, help_text="The course name")
    semester = models.CharField(max_length=20, help_text="The semester of the course")
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="taught_courses",
        limit_choices_to=Q(role="INSTRUCTOR") | Q(role="DEPARTMENT_HEAD"),
    )
    students = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="enrolled_courses",
        blank=True,
        limit_choices_to={"role": "STUDENT"},
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Course"
        verbose_name_plural = "Courses"
        unique_together = ("department", "code", "semester")
        ordering = ["department", "code"]
        indexes = [
            models.Index(fields=["department", "code", "semester"]),
        ]

    def __str__(self):
        return f"{self.get_full_code()} - {self.name} ({self.semester})"

    def get_full_code(self):
        return f"{self.department.code}-{self.code}"

    def clean(self):
        super().clean()
        if self.instructor and self.instructor.department != self.department:
            raise ValidationError(
                "Instructor must belong to the same department as the course."
            )


class LearningOutcome(models.Model):
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="learning_outcomes"
    )
    code = models.CharField(max_length=10, help_text="The code of the learning outcome")
    description = models.TextField(help_text="The description of the learning outcome")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Learning Outcome"
        verbose_name_plural = "Learning Outcomes"
        unique_together = ("course", "code")
        ordering = ["course", "code"]

    def __str__(self):
        return f"{self.course.get_full_code()} - {self.code}"

    def clean(self):
        if self.code and not self.code.startswith("LO-"):
            if self.code.isdigit():
                self.code = f"LO-{self.code}"

        if self.code and not self.code.startswith("LO-"):
            raise ValidationError({"code": 'Must start with "LO-"'})
class Assessment(models.Model):

    class AssessmentType(models.TextChoices):
        MIDTERM = "MIDTERM", "Midterm Exam"
        FINAL = "FINAL", "Final Exam"
        PROJECT = "PROJECT", "Project"
        HOMEWORK = "HOMEWORK", "Homework"
        QUIZ = "QUIZ", "Quiz"
        LAB = "LAB", "Lab"

    course = models.ForeignKey(
            Course,
            on_delete=models.CASCADE,
            related_name="assessments",
         )
    name = models.CharField(
            max_length=50, help_text="Ex: Midterm 1, Final Exam, Project 1"
        )
    assessment_type = models.CharField(
            max_length=20,choices=AssessmentType.choices)
    max_score = models.DecimalField(
            max_digits=6,
            decimal_places=2,
            default=100,
            validators=[MinValueValidator(0)],
        )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
            verbose_name = "Assessment"
            verbose_name_plural = "Assessments"
            ordering = ["course", "assessment_type", "name"]
        
    def __str__(self):
            return f"{self.course.get_full_code()} - {self.name}"
        

class AssessmentToLOContribution(models.Model):
    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name="lo_contributions",
    )
    learning_outcome = models.ForeignKey(
        LearningOutcome,
        on_delete=models.CASCADE,
        related_name="assessment_contributions",
    )

    weight = models.DecimalField(
        max_digits=1,
        decimal_places=1,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        verbose_name = "Assessment to Learning Outcome Contribution"
        verbose_name_plural = "Assessment to Learning Outcome Contributions"
        unique_together = ("assessment", "learning_outcome")

    def __str__(self):
        return f"{self.assessment} -> {self.learning_outcome.code} (Weight: {self.weight})"
    def clean(self):
        if self.learning_outcome.course != self.assessment.course:
            raise ValidationError(
                "Learning Outcome must belong to the same course as the Assessment."
            )
        

class LOtoPOContribution(models.Model):
    learning_outcome = models.ForeignKey(
        LearningOutcome,
        on_delete=models.CASCADE,
        related_name="po_contributions",
    )
    program_outcome = models.ForeignKey(
        "core.ProgramOutcome",
        on_delete=models.CASCADE,
        related_name="lo_contributions",
    )
    weight = models.DecimalField(
        max_digits=1,
        decimal_places=1,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_lo_po_contributions",
        limit_choices_to=Q(role="DEPARTMENT_HEAD"),
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Learning Outcome to Program Outcome Contribution"
        verbose_name_plural = "Learning Outcome to Program Outcome Contributions"
        unique_together = ("learning_outcome", "program_outcome")

    def __str__(self):
        return f"{self.learning_outcome.code} -> {self.program_outcome.code} (Weight: {self.weight})"
    def clean(self):
        if self.learning_outcome.course.department != self.program_outcome.department:
            raise ValidationError(
                "Program Outcome must belong to the same department as the Learning Outcome."
            )
    def approve(self, user):
        if not user.is_department_head():
            raise PermissionError("Only department heads can approve LO-PO contributions.")
        self.is_approved = True
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save()