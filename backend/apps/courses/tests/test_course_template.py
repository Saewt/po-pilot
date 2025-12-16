"""
Tests for CourseTemplate model validation and normalization.
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from apps.core.models import Department
from apps.courses.models import CourseTemplate

User = get_user_model()


class CourseTemplateValidationTests(TestCase):
    """Test CourseTemplate clean() method for data normalization."""

    def setUp(self):
        self.dept = Department.objects.create(name="Computer Science", code="CS")

    def test_code_normalization_strip_and_uppercase(self):
        """Test that code is stripped and uppercased."""
        ct = CourseTemplate(
            department=self.dept,
            code="  cs101  ",
            name="Intro to CS",
            credit=3
        )
        ct.full_clean()
        self.assertEqual(ct.code, "CS101")

    def test_code_already_uppercase(self):
        """Test that already uppercase code is preserved."""
        ct = CourseTemplate(
            department=self.dept,
            code="CS102",
            name="Data Structures",
            credit=3
        )
        ct.full_clean()
        self.assertEqual(ct.code, "CS102")

    def test_name_normalization_strip(self):
        """Test that name is stripped of whitespace."""
        ct = CourseTemplate(
            department=self.dept,
            code="CS103",
            name="  Algorithms  ",
            credit=3
        )
        ct.full_clean()
        self.assertEqual(ct.name, "Algorithms")

    def test_empty_code_raises_validation_error(self):
        """Test that empty code raises ValidationError."""
        ct = CourseTemplate(
            department=self.dept,
            code="",
            name="Test Course",
            credit=3
        )
        with self.assertRaises(ValidationError) as context:
            ct.full_clean()
        self.assertIn("code", context.exception.message_dict)

    def test_whitespace_only_code_raises_validation_error(self):
        """Test that whitespace-only code raises ValidationError."""
        ct = CourseTemplate(
            department=self.dept,
            code="   ",
            name="Test Course",
            credit=3
        )
        with self.assertRaises(ValidationError) as context:
            ct.full_clean()
        self.assertIn("code", context.exception.message_dict)

    def test_empty_name_raises_validation_error(self):
        """Test that empty name raises ValidationError."""
        ct = CourseTemplate(
            department=self.dept,
            code="CS104",
            name="",
            credit=3
        )
        with self.assertRaises(ValidationError) as context:
            ct.full_clean()
        self.assertIn("name", context.exception.message_dict)

    def test_whitespace_only_name_raises_validation_error(self):
        """Test that whitespace-only name raises ValidationError."""
        ct = CourseTemplate(
            department=self.dept,
            code="CS105",
            name="   ",
            credit=3
        )
        with self.assertRaises(ValidationError) as context:
            ct.full_clean()
        self.assertIn("name", context.exception.message_dict)

    def test_save_calls_full_clean(self):
        """Test that save() calls full_clean() for validation."""
        ct = CourseTemplate(
            department=self.dept,
            code="  lower  ",
            name="  Test  ",
            credit=3
        )
        ct.save()
        
        # Reload from DB to verify normalization was persisted
        ct.refresh_from_db()
        self.assertEqual(ct.code, "LOWER")
        self.assertEqual(ct.name, "Test")

    def test_mixed_case_code_uppercased(self):
        """Test that mixed case code is uppercased."""
        ct = CourseTemplate.objects.create(
            department=self.dept,
            code="CsE101",
            name="Computer Science Intro",
            credit=3
        )
        self.assertEqual(ct.code, "CSE101")


class CourseTemplateUniqueTogetherTests(TestCase):
    """Test CourseTemplate unique_together constraint with normalization."""

    def setUp(self):
        self.dept = Department.objects.create(name="Computer Science", code="CS")
        CourseTemplate.objects.create(
            department=self.dept,
            code="CS101",
            name="Intro to CS",
            credit=3
        )

    def test_duplicate_code_same_department_fails(self):
        """Test that duplicate normalized code in same dept raises error."""
        with self.assertRaises(ValidationError):
            CourseTemplate.objects.create(
                department=self.dept,
                code="cs101",  # lowercase but same after normalization
                name="Different Name",
                credit=4
            )

    def test_same_code_different_department_allowed(self):
        """Test that same code in different department is allowed."""
        other_dept = Department.objects.create(name="Mathematics", code="MATH")
        ct = CourseTemplate.objects.create(
            department=other_dept,
            code="CS101",
            name="Math Course",
            credit=3
        )
        self.assertEqual(ct.code, "CS101")
