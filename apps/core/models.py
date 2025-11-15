from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


# Create your models here.
class Department(models.Model):
    name = models.CharField("Department Name", max_length=100)
    code = models.CharField(
        "Department Code", max_length=10, unique=True, db_index=True
    )
    is_active = models.BooleanField("Is Active", default=True)
    created_at = models.DateTimeField("Created At", auto_now_add=True)
    updated_at = models.DateTimeField("Updated At", auto_now=True)

    class Meta:
        verbose_name = "Department"
        verbose_name_plural = "Departments"
        ordering = ["code"]
        indexes = [
            models.Index(fields=["code", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

    def clean(self):
        if self.code:
            self.code = self.code.strip().upper()
        else:
            raise ValidationError("Department code cannot be empty")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ProgramOutcome(models.Model):
    """Program Outcomes (PO). Specific to each department."""
    PO_PREFIX = "PO-"

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        verbose_name="Department",
        related_name="program_outcomes",
    )
    code = models.CharField("PO Code", max_length=10, help_text="Ex: PO-1, PO-2")
    description = models.TextField("Description")
    is_active = models.BooleanField(
        "Is Active?", default=True, help_text="Set to False for obsolete POs"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Created By",
        related_name="created_program_outcomes",
        limit_choices_to={"role": "DEPARTMENT_HEAD"},
    )
    created_at = models.DateTimeField("Creation Date", auto_now_add=True)
    updated_at = models.DateTimeField("Update Date", auto_now=True)

    class Meta:
        verbose_name = "Program Outcome"
        verbose_name_plural = "Program Outcomes"
        unique_together = ("department", "code")
        ordering = ["department", "code"]
        indexes = [
            models.Index(fields=["department", "is_active"]),
        ]

    def __str__(self):
        return f"{self.department.code} - {self.code}"

    def get_full_code(self):
        """Full PO code: CSE-PO-1"""
        return f"{self.department.code}-{self.code}"

    def clean(self):
        """Converts PO code to standard format (PO-1, PO-2)"""
        if self.code:
            cleaned_code = self.code.strip().upper()

            if cleaned_code.isdigit():
                self.code = f"{self.PO_PREFIX}{cleaned_code}"
            elif not cleaned_code.startswith(self.PO_PREFIX):
                raise ValidationError(
                    {"code": f'Program Outcome code must start with "{self.PO_PREFIX}" or be a number.'}
                )
            else:
                self.code = cleaned_code
        else:
            raise ValidationError("Program Outcome code cannot be empty.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)