from django.test import TestCase, RequestFactory
from django.contrib.admin.sites import AdminSite
from apps.courses.admin import CourseInstanceAdmin
from apps.courses.models import CourseInstance
from apps.core.models import Department
from django.contrib.auth import get_user_model
from django.db.models.fields.related import ManyToManyField

User = get_user_model()

class MockSuperUser:
    def has_perm(self, perm):
        return True

class CourseInstanceAdminTest(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.factory = RequestFactory()
        
        # Depts
        self.dept1 = Department.objects.create(code="D1", name="Dept 1")
        self.dept2 = Department.objects.create(code="D2", name="Dept 2")
        
        # Users
        self.head1 = User.objects.create_user(email="head1@test.com", password="password", role="DEPARTMENT_HEAD", department=self.dept1)
        self.student1 = User.objects.create_user(email="s1@test.com", password="password", role="STUDENT", department=self.dept1)
        self.student2 = User.objects.create_user(email="s2@test.com", password="password", role="STUDENT", department=self.dept2)
        self.superuser = User.objects.create_superuser(email="admin@test.com", password="password")

    def test_student_filter_new_instance_dept_head(self):
        """
        When a Dept Head adds a new course instance, they should only see students from their department.
        """
        admin = CourseInstanceAdmin(CourseInstance, self.site)
        request = self.factory.get('/')
        request.user = self.head1
        
        field = CourseInstance._meta.get_field("students")
        
        # Call the method
        form_field = admin.formfield_for_manytomany(field, request)
        
        # Inspect the queryset on the returned form field
        self.assertIsNotNone(form_field)
        self.assertIn(self.student1, form_field.queryset)
        self.assertNotIn(self.student2, form_field.queryset)

    def test_student_filter_new_instance_superuser(self):
        """
        Superusers should see all students.
        """
        admin = CourseInstanceAdmin(CourseInstance, self.site)
        request = self.factory.get('/')
        request.user = self.superuser
        
        field = CourseInstance._meta.get_field("students")
        
        form_field = admin.formfield_for_manytomany(field, request)
        
        self.assertIsNotNone(form_field)
        self.assertIn(self.student1, form_field.queryset)
        self.assertIn(self.student2, form_field.queryset)
