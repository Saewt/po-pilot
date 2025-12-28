from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.core.models import Department, ProgramOutcome
from apps.courses.models import CourseTemplate, CourseInstance, Assessment, LearningOutcome, LOtoPOContribution

User = get_user_model()

class JWTAuthenticationTests(APITestCase):
    def setUp(self):
        self.department = Department.objects.create(name="Computer Engineering", code="CENG")
        self.user_data = {
            "email": "student@university.edu.tr",
            "password": "testpass123",
            "password_confirm": "testpass123",
            "first_name": "Test",
            "last_name": "Student",
            "student_id": "123456789",
            "department": self.department.id
        }
        self.register_url = reverse("register")
        self.login_url = reverse("token_obtain_pair")
        self.refresh_url = reverse("token_refresh")

    def test_registration_success(self):
        """Test user registration with valid data."""
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Registration failed: {response.data}")
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().email, "student@university.edu.tr")

    def test_registration_invalid_email(self):
        """Test registration with non-edu email."""
        self.user_data["email"] = "student@gmail.com"
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_registration_missing_student_id(self):
        """Test registration without student_id."""
        self.user_data.pop("student_id")
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("student_id", response.data)

    def test_login_success(self):
        """Test successful login returns tokens."""
        self.client.post(self.register_url, self.user_data)
        response = self.client.post(self.login_url, {
            "email": self.user_data["email"],
            "password": self.user_data["password"]
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_token_refresh(self):
        """Test token refresh."""
        self.client.post(self.register_url, self.user_data)
        login_response = self.client.post(self.login_url, {
            "email": self.user_data["email"],
            "password": self.user_data["password"]
        })
        refresh_token = login_response.data["refresh"]
        
        response = self.client.post(self.refresh_url, {"refresh": refresh_token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_protected_endpoint(self):
        """Test accessing protected endpoint."""
        self.client.post(self.register_url, self.user_data)
        login_response = self.client.post(self.login_url, {
            "email": self.user_data["email"],
            "password": self.user_data["password"]
        })
        access_token = login_response.data["access"]
        
        # Test with token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get(reverse("me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test without token
        self.client.credentials()
        response = self.client.get(reverse("me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RBACTests(APITestCase):
    def setUp(self):
        self.department = Department.objects.create(name="Computer Science", code="CS")
        
        # Create Users
        self.dept_head = User.objects.create_user(
            email="head@university.edu.tr", 
            password="password", 
            first_name="Head", 
            last_name="Master",
            role="DEPARTMENT_HEAD",
            department=self.department
        )
        self.instructor = User.objects.create_user(
            email="inst@university.edu.tr", 
            password="password", 
            first_name="Inst", 
            last_name="Ruct",
            role="INSTRUCTOR",
            department=self.department
        )
        self.student = User.objects.create_user(
            email="stud@university.edu.tr", 
            password="password", 
            first_name="Stu", 
            last_name="Dent",
            role="STUDENT",
            department=self.department,
            student_id="987654321"
        )
        self.other_student = User.objects.create_user(
            email="other@university.edu.tr", 
            password="password", 
            first_name="Other", 
            last_name="Stu",
            role="STUDENT",
            department=self.department,
            student_id="112233445"
        )
        
        # Create Course Template
        self.course_template = CourseTemplate.objects.create(
            name="Intro to CS",
            code="CS101",
            department=self.department,
            credit=3
        )
        
        # Create Course Instance
        self.course_instance = CourseInstance.objects.create(
            course_template=self.course_template,
            semester="Fall",
            year=2024,
            instructor=self.instructor
        )
        self.course_instance.students.add(self.student)
        
    def get_token(self, user):
        response = self.client.post(reverse("token_obtain_pair"), {
            "email": user.email,
            "password": "password"
        })
        return response.data["access"]

    def test_create_course_template_permissions(self):
        """Test that only Dept Head can create course templates."""
        url = reverse("course-template-list")
        data = {
            "name": "Advanced CS",
            "code": "CS201",
            "department_id": self.department.id,
            "credit": 3
        }
        
        # Student -> Forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.student)}")
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Instructor -> Forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.instructor)}")
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Dept Head -> Success
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.dept_head)}")
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Creation failed: {response.data}")

    def test_course_instance_visibility(self):
        """Test strict filtering of course instances."""
        url = reverse("course-instance-list")
        
        # Student sees only enrolled courses
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.student)}")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle pagination
        results = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(results), 1) # CS101
        self.assertEqual(results[0]["id"], self.course_instance.id)
        
        # Other Student sees nothing
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.other_student)}")
        response = self.client.get(url)
        results = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(results), 0)
        
        # Instructor sees taught courses
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.instructor)}")
        response = self.client.get(url)
        results = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], self.course_instance.id)

    def test_update_course_instance_permission(self):
        """Test permission to update course instance."""
        url = reverse("course-instance-detail", args=[self.course_instance.id])
        data = {"semester": "Spring", "year": 2025}
        
        # Student -> Forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.student)}")
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Instructor (Owner) -> Success
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.instructor)}")
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_instructor_user_listing(self):
        """Test that instructors can list students in their department."""
        url = reverse("user-list")
        
        # Instructor lists students
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.instructor)}")
        response = self.client.get(url, {"role": "STUDENT"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should see 'student' (same dept) but not others if we had strict isolation or if we check content
        results = response.data["results"] if "results" in response.data else response.data
        student_emails = [u["email"] for u in results]
        self.assertIn(self.student.email, student_emails)
        
        # Should NOT see users from other departments (if any existed and logic holds)
        # (For now just verifying access is granted, which was 403 before)

class GradingApprovalTests(APITestCase):
    def setUp(self):
        self.department = Department.objects.create(name="Computer Science", code="CS")
        
        # Users
        self.dept_head = User.objects.create_user(
            email="head@university.edu.tr", password="password", role="DEPARTMENT_HEAD", department=self.department
        )
        self.instructor = User.objects.create_user(
            email="inst@university.edu.tr", password="password", role="INSTRUCTOR", department=self.department
        )
        self.other_instructor = User.objects.create_user(
            email="other@university.edu.tr", password="password", role="INSTRUCTOR", department=self.department
        )
        self.student = User.objects.create_user(
            email="stud@university.edu.tr", password="password", role="STUDENT", department=self.department, student_id="111"
        )
        
        # Course
        self.template = CourseTemplate.objects.create(
            name="Intro CS", code="CS101", department=self.department, credit=3
        )
        self.course = CourseInstance.objects.create(
            course_template=self.template, semester="Fall", year=2024, instructor=self.instructor
        )
        self.course.students.add(self.student)
        
        self.assessment_url = reverse("assessment-list")
        self.grade_url = reverse("grade-list")
        
    def get_token(self, user):
        response = self.client.post(reverse("token_obtain_pair"), {"email": user.email, "password": "password"})
        return response.data["access"]

    def test_assessment_creation_permission(self):
        """Test only course instructor can create assessment."""
        data = {
            "course_instance_id": self.course.id,
            "name": "Midterm 1",
            "assessment_type": "MIDTERM",
            "max_score": 100,
            "weight": 30
        }
        
        # Correct Instructor
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.instructor)}")
        response = self.client.post(self.assessment_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Other Instructor -> Validation Error (not Forbidden, but caught in validation)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.other_instructor)}")
        response = self.client.post(self.assessment_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Student -> Forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.student)}")
        response = self.client.post(self.assessment_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_grading_permissions(self):
        """Test grading permissions."""
        # Create Assessment first
        assessment = Assessment.objects.create(
            course_instance=self.course, name="Quiz 1", assessment_type="QUIZ", max_score=100, weight=10
        )
        
        data = {
            "assessment_id": assessment.id,
            "student_id": self.student.id,
            "score": 85
        }
        
        # Instructor grades -> Success
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.instructor)}")
        success_response = self.client.post(self.grade_url, data)
        self.assertEqual(success_response.status_code, status.HTTP_201_CREATED, f"Failed to grade: {success_response.data}")
        grade_id = success_response.data["id"]
        
        # Other Instructor -> Validation Error
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.other_instructor)}")
        response = self.client.post(self.grade_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Student view own grade -> Success
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.student)}")
        response = self.client.get(reverse("grade-detail", args=[grade_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data["score"]), 85.00)

    def test_approval_workflow(self):
        """Test LO-PO contribution approval."""
        po = ProgramOutcome.objects.create(department=self.department, code="PO-1", description="Test PO")
        lo = LearningOutcome.objects.create(course_template=self.template, code="LO-1", description="Test LO")
        
        # Instructor creates mapping
        url = reverse("lo-po-contribution-list")
        data = {
            "learning_outcome_id": lo.id,
            "program_outcome_id": po.id,
            "weight": 3
        }
        
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.instructor)}")
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        contrib_id = response.data["id"]
        # Check approval_status field instead of is_approved
        self.assertEqual(response.data["approval_status"], "PENDING")
        
        # Instructor check status -> Success
        response = self.client.get(reverse("lo-po-contribution-detail", args=[contrib_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Instructor try approve -> Forbidden (action endpoint uses permission check)
        approve_url = reverse("lo-po-contribution-approval-action", args=[contrib_id])
        response = self.client.post(approve_url, {"action": "approve"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Dept Head approve -> Success
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.get_token(self.dept_head)}")
        response = self.client.post(approve_url, {"action": "approve"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check approval_status field instead of is_approved
        self.assertEqual(response.data["approval_status"], "APPROVED")
