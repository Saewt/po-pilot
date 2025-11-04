from django.db import models
from django.forms import ValidationError
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

# Create your models here.

class AssessmentGrade(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assessment_grades",
        limit_choices_to={"role": "STUDENT"},
    )
    assessment = models.ForeignKey(
        "courses.Assessment", on_delete=models.CASCADE, related_name="grades")
    score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="entered_assessment_grades",)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Assessment Grade"
        verbose_name_plural = "Assessment Grades"
        unique_together = ("student", "assessment")
        ordering = ["student", "assessment__course"]
        indexes = [
            models.Index(fields=["student", "assessment"]),
            models.Index(fields=["assessment", "score"]),
            ]
    def __str__(self):
        return f"{self.student} - {self.assessment} - {self.score}/100"
    def clean(self):
        super().clean()
        if self.score > self.assessment.max_score:
            raise ValidationError(
                f"Score cannot exceed the maximum score of {self.assessment.max_score} for this assessment."
            )
        if not self.assessment.course.students.filter(id=self.student.id).exists():
            raise ValidationError(
                "The student is not enrolled in the course for this assessment."
            )