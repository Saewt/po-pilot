
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated

from apps.courses.models import CourseTemplate, CourseInstance
from apps.api.serializers.courses import (
    CourseTemplateSerializer,
    CourseInstanceSerializer,
)


class CourseTemplateViewSet(ModelViewSet):
    queryset = CourseTemplate.objects.all()
    serializer_class = CourseTemplateSerializer
    permission_classes = [IsAuthenticated]


class CourseInstanceViewSet(ModelViewSet):
    queryset = CourseInstance.objects.select_related("course_template").all()
    serializer_class = CourseInstanceSerializer
    permission_classes = [IsAuthenticated]
