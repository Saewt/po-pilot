# Generated manually for LO-PO approval status update

from django.db import migrations, models


def convert_approval_status(apps, schema_editor):
    """Convert existing is_approved values to new approval_status field."""
    LOtoPOContribution = apps.get_model('courses', 'LOtoPOContribution')
    
    for contribution in LOtoPOContribution.objects.all():
        if contribution.is_approved:
            contribution.approval_status = 'APPROVED'
        else:
            # Check if it was explicitly rejected (has approved_by but not approved)
            if contribution.approved_by and not contribution.is_approved:
                contribution.approval_status = 'DECLINED'
            else:
                contribution.approval_status = 'PENDING'
        contribution.save()


def reverse_convert_approval_status(apps, schema_editor):
    """Convert approval_status back to is_approved field."""
    LOtoPOContribution = apps.get_model('courses', 'LOtoPOContribution')
    
    for contribution in LOtoPOContribution.objects.all():
        contribution.is_approved = contribution.approval_status == 'APPROVED'
        contribution.save()


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0004_add_target_class_year'),
    ]

    operations = [
        # Add new fields
        migrations.AddField(
            model_name='lotopocontribution',
            name='approval_status',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('PENDING', 'Pending'),
                    ('APPROVED', 'Approved'),
                    ('DECLINED', 'Declined')
                ],
                default='PENDING',
                db_index=True,
                help_text='Current approval status of this LO-PO contribution'
            ),
        ),
        migrations.AddField(
            model_name='lotopocontribution',
            name='decline_reason',
            field=models.TextField(
                blank=True,
                null=True,
                help_text='Reason for declining this contribution'
            ),
        ),
        
        # Data migration: Convert existing is_approved values to approval_status
        migrations.RunPython(convert_approval_status, reverse_convert_approval_status),
        
        # Remove old is_approved field
        migrations.RemoveField(
            model_name='lotopocontribution',
            name='is_approved',
        ),
    ]

    operations = [
        # Add new fields
        migrations.AddField(
            model_name='lotopocontribution',
            name='approval_status',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('PENDING', 'Pending'),
                    ('APPROVED', 'Approved'),
                    ('DECLINED', 'Declined')
                ],
                default='PENDING',
                db_index=True,
                help_text='Current approval status of this LO-PO contribution'
            ),
        ),
        migrations.AddField(
            model_name='lotopocontribution',
            name='decline_reason',
            field=models.TextField(
                blank=True,
                null=True,
                help_text='Reason for declining this contribution'
            ),
        ),
        
        # Data migration: Convert existing is_approved values to approval_status
        migrations.RunPython(
            lambda apps, schema_editor: None,  # Will be handled manually
            reverse_code=lambda apps, schema_editor: None
        ),
        
        # Remove the old is_approved field
        migrations.RemoveField(
            model_name='lotopocontribution',
            name='is_approved',
        ),
    ]