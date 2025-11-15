from django.contrib import admin, messages
from .models import (
    CourseTemplate,
    CourseInstance,
    LearningOutcome,
    Assessment,
    AssessmentToLOContribution,
    LOtoPOContribution,
)

# -------------------
# INLINES
# -------------------

class LearningOutcomeInline(admin.TabularInline):
    model = LearningOutcome
    extra = 1
    fields = ["code", "description"]


class AssessmentInline(admin.TabularInline):
    model = Assessment
    extra = 1
    fields = ["name", "assessment_type", "max_score", "weight"]


class AssessmentToLOInline(admin.TabularInline):
    model = AssessmentToLOContribution
    extra = 1
    fields = ["learning_outcome", "weight"]


class LOtoPOInline(admin.TabularInline):
    model = LOtoPOContribution
    extra = 1
    fields = ["program_outcome", "weight", "is_approved", "approved_by", "approved_at"]
    readonly_fields = ["is_approved", "approved_by", "approved_at"]


# -------------------
# ADMINS
# -------------------

@admin.register(CourseTemplate)
class CourseTemplateAdmin(admin.ModelAdmin):
    list_display = ("department", "code", "name", "credit")
    list_filter = ("department",)
    search_fields = ("code", "name", "department__code", "department__name")
    inlines = [LearningOutcomeInline]


@admin.register(CourseInstance)
class CourseInstanceAdmin(admin.ModelAdmin):
    list_display = ("get_full_code", "semester", "year", "instructor", "is_active")
    list_filter = ("course_template__department", "semester", "year", "is_active")
    search_fields = ("course_template__code", "course_template__name", "instructor__email")
    filter_horizontal = ("students",)
    inlines = [AssessmentInline]

    def get_full_code(self, obj):
        return obj.get_full_code()
    get_full_code.short_description = "Course Instance"


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ("name", "course_instance", "assessment_type", "max_score", "weight")
    list_filter = ("assessment_type", "course_instance__course_template__department")
    search_fields = ("name", "course_instance__course_template__code", "course_instance__course_template__name")
    inlines = [AssessmentToLOInline]


@admin.register(LearningOutcome)
class LearningOutcomeAdmin(admin.ModelAdmin):
    list_display = ("code", "course_template", "get_department", "description")
    list_filter = ("course_template__department",)
    search_fields = ("code", "description", "course_template__code", "course_template__name")
    inlines = [LOtoPOInline]

    def get_department(self, obj):
        return obj.course_template.department
    get_department.short_description = "Department"


@admin.register(AssessmentToLOContribution)
class AssessmentToLOContributionAdmin(admin.ModelAdmin):
    list_display = ("assessment", "learning_outcome", "weight")
    list_filter = ("assessment__course_instance__course_template__department",)
    search_fields = ("assessment__name", "learning_outcome__code")


@admin.register(LOtoPOContribution)
class LOtoPOContributionAdmin(admin.ModelAdmin):
    list_display = ("learning_outcome", "program_outcome", "weight", "is_approved", "approved_by", "approved_at")
    list_filter = (
        "is_approved",
        "learning_outcome__course_template__department",
        "program_outcome__department",
    )
    search_fields = ("learning_outcome__code", "program_outcome__code")
    actions = ["approve_mappings"]

    def approve_mappings(self, request, queryset):
        user = request.user
        if not hasattr(user, "is_department_head") or not user.is_department_head():
            self.message_user(
                request,
                "Only department heads can approve mappings!",
                level=messages.ERROR,
            )
            return

        count = 0
        for mapping in queryset:
            mapping.approve(user)
            count += 1

        self.message_user(request, f"{count} mapping approved.", level=messages.SUCCESS)

    approve_mappings.short_description = "Approve selected LO-PO mappings"