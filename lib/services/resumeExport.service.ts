import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import jsPDF from 'jspdf';
import { ResumeData, ExportFormat } from '@/types/resume.types';

/**
 * Resume Export Service
 * 
 * CRITICAL: Fail-loud error handling. All export failures throw detailed errors.
 */

/**
 * Exports resume data to DOCX format
 */
export async function exportToDocx(resumeData: ResumeData): Promise<Buffer> {
    if (!resumeData) {
        throw new Error('Cannot export null or undefined resume data to DOCX');
    }

    try {
        const sections: Paragraph[] = [];

        // Header - Personal Info
        if (resumeData.personalInfo) {
            const { fullName, email, phone, location, website, linkedin, github, summary } = resumeData.personalInfo;

            sections.push(
                new Paragraph({
                    text: fullName || 'No Name',
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                })
            );

            const contactInfo: string[] = [];
            if (email) contactInfo.push(email);
            if (phone) contactInfo.push(phone);
            if (location) contactInfo.push(location);

            if (contactInfo.length > 0) {
                sections.push(
                    new Paragraph({
                        text: contactInfo.join(' | '),
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 100 },
                    })
                );
            }

            const links: string[] = [];
            if (website) links.push(website);
            if (linkedin) links.push(`LinkedIn: ${linkedin}`);
            if (github) links.push(`GitHub: ${github}`);

            if (links.length > 0) {
                sections.push(
                    new Paragraph({
                        text: links.join(' | '),
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                    })
                );
            }

            if (summary) {
                sections.push(
                    new Paragraph({
                        text: 'Summary',
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 200, after: 100 },
                    }),
                    new Paragraph({
                        text: summary,
                        spacing: { after: 200 },
                    })
                );
            }
        }

        // Work Experience
        if (resumeData.workExperience && resumeData.workExperience.length > 0) {
            sections.push(
                new Paragraph({
                    text: 'Work Experience',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 },
                })
            );

            for (const exp of resumeData.workExperience) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: exp.position, bold: true }),
                            new TextRun({ text: ` at ${exp.company}` }),
                        ],
                        spacing: { after: 50 },
                    })
                );

                const dateRange = exp.current
                    ? `${exp.startDate} - Present`
                    : `${exp.startDate} - ${exp.endDate || 'N/A'}`;

                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `${dateRange}${exp.location ? ` | ${exp.location}` : ''}`,
                                italics: true,
                            }),
                        ],
                        spacing: { after: 100 },
                    })
                );

                // Show achievements if they exist, otherwise convert description to bullets
                const bulletsToShow = (exp.achievements && exp.achievements.length > 0)
                    ? exp.achievements.filter(b => b && b.trim().length > 0)
                    : convertDescriptionToBullets(exp.description || '');

                if (bulletsToShow.length > 0) {
                    for (const bullet of bulletsToShow) {
                        sections.push(
                            new Paragraph({
                                text: `• ${bullet}`,
                                spacing: { after: 50 },
                            })
                        );
                    }
                }

                sections.push(new Paragraph({ text: '', spacing: { after: 100 } }));
            }
        }

        // Education
        if (resumeData.education && resumeData.education.length > 0) {
            sections.push(
                new Paragraph({
                    text: 'Education',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 },
                })
            );

            for (const edu of resumeData.education) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: edu.degree, bold: true }),
                            new TextRun({ text: ` in ${edu.field}` }),
                        ],
                        spacing: { after: 50 },
                    })
                );

                const dateRange = edu.current
                    ? `${edu.startDate} - Present`
                    : `${edu.startDate} - ${edu.endDate || 'N/A'}`;

                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `${edu.institution} | ${dateRange}${edu.location ? ` | ${edu.location}` : ''}`,
                                italics: true,
                            }),
                        ],
                        spacing: { after: 100 },
                    })
                );

                if (edu.gpa) {
                    sections.push(
                        new Paragraph({
                            text: `GPA: ${edu.gpa}`,
                            spacing: { after: 50 },
                        })
                    );
                }

                if (edu.achievements && edu.achievements.length > 0) {
                    for (const achievement of edu.achievements) {
                        sections.push(
                            new Paragraph({
                                text: `• ${achievement}`,
                                spacing: { after: 50 },
                            })
                        );
                    }
                }

                sections.push(new Paragraph({ text: '', spacing: { after: 100 } }));
            }
        }

        // Projects
        if (resumeData.projects && resumeData.projects.length > 0) {
            sections.push(
                new Paragraph({
                    text: 'Projects',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 },
                })
            );

            for (const project of resumeData.projects) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: project.title,
                                bold: true,
                            }),
                        ],
                        spacing: { after: 50 },
                    })
                );

                // Show highlights if they exist, otherwise convert description to bullets
                const bulletsToShow = (project.highlights && Array.isArray(project.highlights) && project.highlights.length > 0)
                    ? project.highlights.filter(h => h && h.trim().length > 0)
                    : convertDescriptionToBullets(project.description || '');

                if (bulletsToShow.length > 0) {
                    for (const bullet of bulletsToShow) {
                        sections.push(
                            new Paragraph({
                                text: `• ${bullet}`,
                                spacing: { after: 50 },
                            })
                        );
                    }
                }

                if (project.technologies && project.technologies.length > 0) {
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Technologies: ${project.technologies.join(', ')}`,
                                    italics: true,
                                }),
                            ],
                            spacing: { after: 50 },
                        })
                    );
                }

                if (project.url) {
                    sections.push(
                        new Paragraph({
                            text: `URL: ${project.url}`,
                            spacing: { after: 50 },
                        })
                    );
                }

                sections.push(new Paragraph({ text: '', spacing: { after: 100 } }));
            }
        }

        // Skills
        if (resumeData.skills && resumeData.skills.length > 0) {
            sections.push(
                new Paragraph({
                    text: 'Skills',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 },
                })
            );

            for (const skillCategory of resumeData.skills) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: `${skillCategory.category}: `, bold: true }),
                            new TextRun({ text: skillCategory.skills.join(', ') }),
                        ],
                        spacing: { after: 100 },
                    })
                );
            }
        }

        // Certifications
        if (resumeData.certifications && resumeData.certifications.length > 0) {
            sections.push(
                new Paragraph({
                    text: 'Certifications',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 },
                })
            );

            for (const cert of resumeData.certifications) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: cert.name, bold: true }),
                            new TextRun({ text: ` - ${cert.issuer}` }),
                        ],
                        spacing: { after: 50 },
                    })
                );

                const certDate = cert.expiryDate
                    ? `${cert.issueDate} - ${cert.expiryDate}`
                    : cert.issueDate;

                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: certDate,
                                italics: true,
                            }),
                        ],
                        spacing: { after: 50 },
                    })
                );

                if (cert.credentialUrl) {
                    sections.push(
                        new Paragraph({
                            text: `Credential: ${cert.credentialUrl}`,
                            spacing: { after: 100 },
                        })
                    );
                }
            }
        }

        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children: sections,
                },
            ],
        });

        const buffer = await Packer.toBuffer(doc);
        return buffer;
    } catch (error) {
        throw new Error(
            `DOCX export failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            `Resume title: ${resumeData.personalInfo?.fullName || 'Unknown'}`
        );
    }
}

/**
 * Converts description text into bullet points
 * Splits by newlines first, then by sentences if no newlines
 */
function convertDescriptionToBullets(description: string): string[] {
    if (!description || description.trim().length === 0) {
        return [];
    }

    // First, try splitting by newlines (user may have formatted it)
    const lines = description.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length > 1) {
        // User formatted with line breaks, use those
        return lines.map(line => line.trim());
    }

    // No line breaks, split by sentences
    // Split by periods, exclamation marks, question marks, or semicolons
    const sentences = description
        .split(/[.!?;]\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (sentences.length > 0) {
        return sentences;
    }

    // Fallback: return the whole description as a single bullet
    return [description.trim()];
}

/**
 * Exports resume data to PDF format
 */
export function exportToPdf(resumeData: ResumeData): Buffer {
    if (!resumeData) {
        throw new Error('Cannot export null or undefined resume data to PDF');
    }

    try {
        const doc = new jsPDF();
        let yPosition = 20;
        const lineHeight = 7;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;

        const checkPageBreak = (additionalSpace: number = 10) => {
            if (yPosition + additionalSpace > pageHeight - margin) {
                doc.addPage();
                yPosition = 20;
            }
        };

        // Personal Info
        if (resumeData.personalInfo) {
            const { fullName, email, phone, location, website, linkedin, github, summary } = resumeData.personalInfo;

            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text(fullName || 'No Name', doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
            yPosition += 10;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const contactInfo: string[] = [];
            if (email) contactInfo.push(email);
            if (phone) contactInfo.push(phone);
            if (location) contactInfo.push(location);

            if (contactInfo.length > 0) {
                doc.text(contactInfo.join(' | '), doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
                yPosition += lineHeight;
            }

            const links: string[] = [];
            if (website) links.push(website);
            if (linkedin) links.push(`LinkedIn: ${linkedin}`);
            if (github) links.push(`GitHub: ${github}`);

            if (links.length > 0) {
                doc.text(links.join(' | '), doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
                yPosition += lineHeight;
            }

            if (summary) {
                yPosition += 5;
                checkPageBreak(20);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('Summary', margin, yPosition);
                yPosition += lineHeight;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const splitSummary = doc.splitTextToSize(summary, doc.internal.pageSize.width - 2 * margin) as string[];
                doc.text(splitSummary, margin, yPosition);
                yPosition += splitSummary.length * lineHeight;
            }
        }

        // Work Experience
        if (resumeData.workExperience && resumeData.workExperience.length > 0) {
            yPosition += 10;
            checkPageBreak(20);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Work Experience', margin, yPosition);
            yPosition += lineHeight + 3;

            for (const exp of resumeData.workExperience) {
                checkPageBreak(30);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(`${exp.position} at ${exp.company}`, margin, yPosition);
                yPosition += lineHeight;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                const dateRange = exp.current
                    ? `${exp.startDate} - Present`
                    : `${exp.startDate} - ${exp.endDate || 'N/A'}`;
                const locationText = exp.location ? ` | ${exp.location}` : '';
                doc.text(`${dateRange}${locationText}`, margin, yPosition);
                yPosition += lineHeight;

                // Show achievements if they exist, otherwise convert description to bullets
                const bulletsToShow = (exp.achievements && exp.achievements.length > 0)
                    ? exp.achievements.filter(b => b && b.trim().length > 0)
                    : convertDescriptionToBullets(exp.description || '');

                if (bulletsToShow.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    for (const bullet of bulletsToShow) {
                        checkPageBreak(10);
                        const splitBullet = doc.splitTextToSize(bullet, doc.internal.pageSize.width - 2 * margin - 5) as string[];
                        if (splitBullet && splitBullet.length > 0 && splitBullet[0]) {
                            doc.text(`• ${splitBullet[0]}`, margin + 5, yPosition);
                            yPosition += lineHeight;
                            // Handle multi-line bullets
                            for (let i = 1; i < splitBullet.length; i++) {
                                const bulletLine = splitBullet[i];
                                if (bulletLine) {
                                    checkPageBreak(10);
                                    doc.text(bulletLine, margin + 10, yPosition);
                                    yPosition += lineHeight;
                                }
                            }
                        }
                    }
                }

                yPosition += 5;
            }
        }

        // Education
        if (resumeData.education && resumeData.education.length > 0) {
            yPosition += 5;
            checkPageBreak(20);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Education', margin, yPosition);
            yPosition += lineHeight + 3;

            for (const edu of resumeData.education) {
                checkPageBreak(30);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(`${edu.degree} in ${edu.field}`, margin, yPosition);
                yPosition += lineHeight;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                const dateRange = edu.current
                    ? `${edu.startDate} - Present`
                    : `${edu.startDate} - ${edu.endDate || 'N/A'}`;
                const locationText = edu.location ? ` | ${edu.location}` : '';
                doc.text(`${edu.institution} | ${dateRange}${locationText}`, margin, yPosition);
                yPosition += lineHeight;

                if (edu.gpa) {
                    doc.setFont('helvetica', 'normal');
                    doc.text(`GPA: ${edu.gpa}`, margin, yPosition);
                    yPosition += lineHeight;
                }

                if (edu.achievements && edu.achievements.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    for (const achievement of edu.achievements) {
                        if (!achievement || achievement.trim().length === 0) continue;
                        checkPageBreak(10);
                        const splitAchievement = doc.splitTextToSize(achievement, doc.internal.pageSize.width - 2 * margin - 5) as string[];
                        if (splitAchievement && splitAchievement.length > 0 && splitAchievement[0]) {
                            doc.text(`• ${splitAchievement[0]}`, margin + 5, yPosition);
                            yPosition += lineHeight;
                            // Handle multi-line achievements
                            for (let i = 1; i < splitAchievement.length; i++) {
                                const achievementLine = splitAchievement[i];
                                if (achievementLine) {
                                    checkPageBreak(10);
                                    doc.text(achievementLine, margin + 10, yPosition);
                                    yPosition += lineHeight;
                                }
                            }
                        }
                    }
                }

                yPosition += 5;
            }
        }

        // Projects
        if (resumeData.projects && Array.isArray(resumeData.projects) && resumeData.projects.length > 0) {
            yPosition += 5;
            checkPageBreak(20);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Projects', margin, yPosition);
            yPosition += lineHeight + 3;

            for (const project of resumeData.projects) {
                if (!project) continue; // Skip null/undefined projects

                checkPageBreak(30);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                const projectTitle = project.title || 'Untitled Project';
                doc.text(projectTitle, margin, yPosition);
                yPosition += lineHeight;

                // Add date range if available
                if (project.startDate || project.endDate) {
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'italic');
                    const projectDateRange = project.endDate
                        ? `${project.startDate || 'N/A'} - ${project.endDate}`
                        : project.startDate
                            ? `${project.startDate} - Present`
                            : '';
                    if (projectDateRange) {
                        doc.text(projectDateRange, margin, yPosition);
                        yPosition += lineHeight;
                    }
                }

                // Show highlights if they exist, otherwise convert description to bullets
                const bulletsToShow = (project.highlights && Array.isArray(project.highlights) && project.highlights.length > 0)
                    ? project.highlights.filter(h => h && h.trim().length > 0)
                    : convertDescriptionToBullets(project.description || '');

                if (bulletsToShow.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    for (const bullet of bulletsToShow) {
                        checkPageBreak(10);
                        const splitBullet = doc.splitTextToSize(bullet, doc.internal.pageSize.width - 2 * margin - 5) as string[];
                        if (splitBullet && splitBullet.length > 0 && splitBullet[0]) {
                            doc.text(`• ${splitBullet[0]}`, margin + 5, yPosition);
                            yPosition += lineHeight;
                            // Handle multi-line bullets
                            for (let i = 1; i < splitBullet.length; i++) {
                                const bulletLine = splitBullet[i];
                                if (bulletLine) {
                                    checkPageBreak(10);
                                    doc.text(bulletLine, margin + 10, yPosition);
                                    yPosition += lineHeight;
                                }
                            }
                        }
                    }
                }

                if (project.technologies && Array.isArray(project.technologies) && project.technologies.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'italic');
                    doc.text(`Technologies: ${project.technologies.join(', ')}`, margin, yPosition);
                    yPosition += lineHeight;
                }

                if (project.url || project.githubUrl) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    if (project.url) {
                        doc.text(`URL: ${project.url}`, margin, yPosition);
                        yPosition += lineHeight;
                    }
                    if (project.githubUrl) {
                        doc.text(`GitHub: ${project.githubUrl}`, margin, yPosition);
                        yPosition += lineHeight;
                    }
                }

                yPosition += 5;
            }
        }

        // Skills
        if (resumeData.skills && resumeData.skills.length > 0) {
            yPosition += 5;
            checkPageBreak(20);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Skills', margin, yPosition);
            yPosition += lineHeight + 3;

            doc.setFontSize(10);
            for (const skillCategory of resumeData.skills) {
                checkPageBreak(15);
                doc.setFont('helvetica', 'bold');
                doc.text(`${skillCategory.category}:`, margin, yPosition);
                doc.setFont('helvetica', 'normal');
                doc.text(skillCategory.skills.join(', '), margin + 40, yPosition);
                yPosition += lineHeight;
            }
        }

        // Certifications
        if (resumeData.certifications && Array.isArray(resumeData.certifications) && resumeData.certifications.length > 0) {
            yPosition += 5;
            checkPageBreak(20);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Certifications', margin, yPosition);
            yPosition += lineHeight + 3;

            for (const cert of resumeData.certifications) {
                if (!cert) continue; // Skip null/undefined certifications

                checkPageBreak(25);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                const certName = cert.name || 'Unnamed Certification';
                const certIssuer = cert.issuer || 'Unknown Issuer';
                doc.text(`${certName} - ${certIssuer}`, margin, yPosition);
                yPosition += lineHeight;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                const certDate = cert.expiryDate
                    ? `${cert.issueDate || 'N/A'} - ${cert.expiryDate}`
                    : cert.issueDate || 'N/A';
                const credentialIdText = cert.credentialId ? ` | ID: ${cert.credentialId}` : '';
                doc.text(`${certDate}${credentialIdText}`, margin, yPosition);
                yPosition += lineHeight;

                if (cert.credentialUrl) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    const splitUrl = doc.splitTextToSize(`Credential: ${cert.credentialUrl}`, doc.internal.pageSize.width - 2 * margin) as string[];
                    doc.text(splitUrl, margin, yPosition);
                    yPosition += splitUrl.length * lineHeight;
                }

                yPosition += 5;
            }
        }

        // Custom Sections
        if (resumeData.customSections && resumeData.customSections.length > 0) {
            // Sort custom sections by order
            const sortedCustomSections = [...resumeData.customSections].sort((a, b) => a.order - b.order);

            for (const customSection of sortedCustomSections) {
                yPosition += 5;
                checkPageBreak(20);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(customSection.title, margin, yPosition);
                yPosition += lineHeight + 3;

                if (customSection.content) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    const splitContent = doc.splitTextToSize(customSection.content, doc.internal.pageSize.width - 2 * margin) as string[];
                    doc.text(splitContent, margin, yPosition);
                    yPosition += splitContent.length * lineHeight;
                }
            }
        }

        return Buffer.from(doc.output('arraybuffer'));
    } catch (error) {
        throw new Error(
            `PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            `Resume title: ${resumeData.personalInfo?.fullName || 'Unknown'}`
        );
    }
}

/**
 * Main export function that routes to appropriate format
 */
export function exportResume(
    resumeData: ResumeData,
    format: ExportFormat
): Promise<Buffer> | Buffer {
    if (!resumeData) {
        throw new Error('Resume data is required for export');
    }

    if (!format) {
        throw new Error('Export format is required (PDF or DOCX)');
    }

    switch (format) {
        case 'PDF':
            return exportToPdf(resumeData);
        case 'DOCX':
            return exportToDocx(resumeData);
        default:
            throw new Error(
                `Unsupported export format: ${String(format)}. Supported formats: PDF, DOCX`
            );
    }
}

