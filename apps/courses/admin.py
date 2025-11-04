
from django.contrib import admin
from .models import (
    Course, LearningOutcome, Assessment,
    AssessmentToLOContribution, LOtoPOContribution
)

class LearningOutcomeInline(admin.TabularInline):
    model = LearningOutcome
    extra = 1
    fields = ['code', 'description']

class AssessmentInline(admin.TabularInline):
    model = Assessment
    extra = 1
    fields = ['name', 'assessment_type', 'max_score']

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('get_full_code', 'name', 'department', 'semester', 'instructor', 'is_active')
    list_filter = ('department', 'semester', 'is_active')
    search_fields = ('code', 'name')
    filter_horizontal = ('students',) 
    inlines = [LearningOutcomeInline, AssessmentInline]
    
    def get_full_code(self, obj):
        return obj.get_full_code()
    get_full_code.short_description = 'Course Code'


class AssessmentToLOInline(admin.TabularInline):
    model = AssessmentToLOContribution
    extra = 1
    fields = ['learning_outcome', 'weight']

@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'course', 'assessment_type', 'max_score')
    list_filter = ('assessment_type', 'course__department')
    search_fields = ('name', 'course__code')
    inlines = [AssessmentToLOInline]

class LOtoPOInline(admin.TabularInline):
    model = LOtoPOContribution
    extra = 1
    fields = ['program_outcome', 'weight', 'is_approved']
    readonly_fields = ['is_approved'] 

@admin.register(LearningOutcome)
class LearningOutcomeAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'course', 'code', 'description')
    list_filter = ('course__department',)
    search_fields = ('code', 'description', 'course__code')
    inlines = [LOtoPOInline]

@admin.register(LOtoPOContribution)
class LOtoPOContributionAdmin(admin.ModelAdmin):
    list_display = ('learning_outcome', 'program_outcome', 'weight', 'is_approved', 'approved_by')
    list_filter = ('is_approved', 'learning_outcome__course__department')
    actions = ['approve_mappings']
    
    def approve_mappings(self, request, queryset):
        if not request.user.is_department_head():
            self.message_user(request, "Only department heads can approve mappings!", level='error')
            return
        
        for mapping in queryset:
            mapping.approve(request.user)
        
        self.message_user(request, f"{queryset.count()} approved.")
    approve_mappings.short_description = "Approve selected LO-PO Mappings"