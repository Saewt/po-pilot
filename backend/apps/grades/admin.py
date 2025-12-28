from django.contrib import admin
from .models import AssessmentGrade


@admin.register(AssessmentGrade)
class AssessmentGradeAdmin(admin.ModelAdmin):
    list_display = ('student', 'assessment', 'score', 'entered_by', 'created_at')
    list_filter = ('assessment__course_instance', 'assessment__assessment_type', 'created_at')
    search_fields = (
        'student__first_name', 
        'student__last_name', 
        'student__student_id',
        'assessment__name',
        'assessment__course_instance__course_template__name'
    )
    autocomplete_fields = ['student', 'assessment', 'entered_by']
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'student', 
            'assessment', 
            'assessment__course_instance',
            'assessment__course_instance__course_template',
            'entered_by'
        )
