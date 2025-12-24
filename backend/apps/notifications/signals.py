from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver

from apps.grades.models import AssessmentGrade
from apps.courses.models import CourseInstance
from django.db.models.signals import post_save
from apps.notifications.models import Notification
from apps.courses.models import CourseAnnouncement

@receiver(post_save, sender=AssessmentGrade)
def notify_grade_posted(sender, instance: AssessmentGrade, created, **kwargs):
    assessment = instance.assessment
    course_instance = assessment.course_instance

    title = "Notunuz güncellendi" if not created else "Yeni not girildi"
    message = (
        f"{course_instance.get_full_code()} dersinde "
        f"'{assessment.name}' için notunuz: "
        f"{instance.score}/{assessment.max_score}"
    )

    Notification.objects.create(
        recipient=instance.student,
        notification_type=Notification.Type.GRADE_POSTED,
        title=title,
        message=message,
    )

@receiver(m2m_changed, sender=CourseInstance.students.through)
def notify_course_enrolled(sender, instance, action, pk_set, **kwargs):
    if action != "post_add":
        return
    for student_id in pk_set:
        Notification.objects.create(
            recipient_id=student_id,
            notification_type=Notification.Type.COURSE_ENROLLED,
            title="Derse eklendiniz",
            message=f"{instance.get_full_code()} dersine kaydınız yapıldı.",
        )

@receiver(post_save, sender=CourseAnnouncement)
def notify_course_announcement(sender, instance: CourseAnnouncement, created, **kwargs):
    if not created:
        return

    course = instance.course_instance
    student_ids = list(course.students.values_list("id", flat=True))

    for uid in student_ids:
        Notification.objects.create(
            recipient_id=uid,
            notification_type=Notification.Type.GENERAL,
            title=f"Duyuru: {instance.title}",
            message=f"{course.get_full_code()} - {instance.message}",
            related_object_type="CourseAnnouncement",
            related_object_id=str(instance.id),
        )


@receiver(post_save, sender="core.DepartmentAnnouncement")
def notify_department_announcement(sender, instance, created, **kwargs):
    if not created:
        return

    from apps.core.models import DepartmentAnnouncement

    if instance.audience == DepartmentAnnouncement.Audience.STUDENTS:
        recipients = instance.department.members.filter(role="STUDENT")
    elif instance.audience == DepartmentAnnouncement.Audience.INSTRUCTORS:
        recipients = instance.department.members.filter(role="INSTRUCTOR")
    else:
        recipients = instance.department.members.filter(role__in=["STUDENT", "INSTRUCTOR"])

    recipient_ids = list(recipients.values_list("id", flat=True))

    Notification.objects.bulk_create(
        [
            Notification(
                recipient_id=uid,
                notification_type=Notification.Type.GENERAL,
                title=f"Duyuru: {instance.title}",
                message=f"{instance.department.code} - {instance.message}",
                related_object_type="DepartmentAnnouncement",
                related_object_id=str(instance.id),
            )
            for uid in recipient_ids
        ]
    )