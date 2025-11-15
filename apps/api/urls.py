
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views.core import ProgramOutcomeViewSet
from .views.courses import CourseTemplateViewSet, CourseInstanceViewSet
from .views.users import MeView

router = DefaultRouter()
router.register(r"program-outcomes", ProgramOutcomeViewSet, basename="program-outcome")
router.register(r"course-templates", CourseTemplateViewSet, basename="course-template")
router.register(r"course-instances", CourseInstanceViewSet, basename="course-instance")

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
]

urlpatterns += router.urls
