from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.core.models import Department, ProgramOutcome
from apps.courses.models import CourseTemplate, LearningOutcome, LOtoPOContribution

User = get_user_model()

class LOPOFlowTests(APITestCase):
    def setUp(self):
        # Create department
        self.dept = Department.objects.create(name="Computer Science", code="CS")
        
        # Create users
        self.head = User.objects.create_user(
            email="head@test.com", password="password", role="DEPARTMENT_HEAD", department=self.dept
        )
        self.instructor = User.objects.create_user(
            email="instructor@test.com", password="password", role="INSTRUCTOR", department=self.dept
        )
        self.student = User.objects.create_user(
            email="student@test.com", password="password", role="STUDENT", department=self.dept
        )

        # Create PO
        self.po = ProgramOutcome.objects.create(
            department=self.dept, code="1", description="Critical Thinking", created_by=self.head
        )

        # Create Course Templates
        self.course1 = CourseTemplate.objects.create(
            department=self.dept, code="101", name="Intro to CS", credit=3
        )
        self.course2 = CourseTemplate.objects.create(
            department=self.dept, code="102", name="Data Structures", credit=4
        )

        # Create LOs
        self.lo1 = LearningOutcome.objects.create(
            course_template=self.course1, code="1", description="Understand basics"
        )
        self.lo2 = LearningOutcome.objects.create(
            course_template=self.course2, code="1", description="Understand usage"
        )

        # Create Contribution
        self.contribution = LOtoPOContribution.objects.create(
            learning_outcome=self.lo1, program_outcome=self.po, weight=3
        )

    def test_lo_filtering(self):
        self.client.force_authenticate(user=self.instructor)
        url = reverse("learning-outcome-list")

        # 1. Filter by Course 1
        response = self.client.get(url, {"course_template_id": self.course1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.lo1.id)

        # 2. Filter by Scope Department
        response = self.client.get(url, {"scope": "department"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see both LO1 and LO2
        self.assertEqual(len(response.data), 2)
        ids = [lo["id"] for lo in response.data]
        self.assertIn(self.lo1.id, ids)
        self.assertIn(self.lo2.id, ids)

    def test_po_lo_summary(self):
        self.client.force_authenticate(user=self.head)
        url = reverse("program-outcome-lo-summary", args=[self.po.id])
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertIn("contributions", response.data)
        contributions = response.data["contributions"]
        self.assertEqual(len(contributions), 1)
        
        item = contributions[0]
        self.assertEqual(item["learning_outcome"]["id"], self.lo1.id)
        self.assertEqual(item["weight"], "3.0") # Decimal
        self.assertEqual(item["status"], "Pending")

    def test_contribution_rejection(self):
        self.client.force_authenticate(user=self.head)
        # Ensure initial state
        self.assertFalse(self.contribution.is_approved)
        self.assertIsNone(self.contribution.approved_by)

        # Approve first (to switch back potentially? or just reject pending)
        # Let's reject pending
        url = reverse("lo-po-contribution-reject", args=[self.contribution.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.contribution.refresh_from_db()
        
        self.assertFalse(self.contribution.is_approved)
        self.assertEqual(self.contribution.approved_by, self.head)
        self.assertIsNotNone(self.contribution.approved_at)

        # Verify status in summary changes
        summary_url = reverse("program-outcome-lo-summary", args=[self.po.id])
        response = self.client.get(summary_url)
        item = response.data["contributions"][0]
        self.assertEqual(item["status"], "Rejected")
    
    def test_reject_permission(self):
        self.client.force_authenticate(user=self.instructor)
        url = reverse("lo-po-contribution-reject", args=[self.contribution.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
