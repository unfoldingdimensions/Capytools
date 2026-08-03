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
export async function exportToDocx(resumeData: ResumeData, headline?: string): Promise<Buffer> {
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

            if (headline) {
                sections.push(
                    new Paragraph({
                        text: headline,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                    })
                );
            }

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
export function exportToPdf(resumeData: ResumeData, isAtsMode: boolean = false, headline?: string): Buffer {
    if (!resumeData) {
        throw new Error('Cannot export null or undefined resume data to PDF');
    }

    try {
        const doc = new jsPDF({
            unit: 'pt', // Use points for more precise control if needed, but keeping default (mm) is fine. defaulting to standard
        });

        // ATS Mode: Set Metadata
        if (isAtsMode && resumeData.personalInfo?.fullName) {
            doc.setProperties({
                title: `${resumeData.personalInfo.fullName} - Resume`,
                author: resumeData.personalInfo.fullName,
                subject: 'Resume',
                creator: 'Handcraft Resume Builder',
                keywords: 'resume, cv, professional',
            });
        }

        let yPosition = 20;
        const lineHeight = 6; // Reduced slightly for better density
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        const contentWidth = doc.internal.pageSize.width - 2 * margin;

        const checkPageBreak = (additionalSpace: number = 10) => {
            if (yPosition + additionalSpace > pageHeight - margin) {
                doc.addPage();
                yPosition = 20;
            }
        };

        // Personal Info
        if (resumeData.personalInfo) {
            const { fullName, email, phone, location, website, linkedin, github, summary } = resumeData.personalInfo;

            doc.setFontSize(22);
            // ATS Mode: Force standard font
            doc.setFont(isAtsMode ? 'times' : 'helvetica', 'bold');
            doc.text(fullName || 'No Name', doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
            yPosition += 12;

            if (headline) {
                doc.setFontSize(13);
                doc.setFont('helvetica', 'normal');
                doc.text(headline, doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
                yPosition += 10;
            }

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const contactInfo: string[] = [];
            if (email) contactInfo.push(email);
            if (phone) contactInfo.push(phone);
            if (location) contactInfo.push(location);

            if (contactInfo.length > 0) {
                doc.text(contactInfo.join(' | '), doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
                yPosition += 6;
            }

            const links: string[] = [];
            if (website) links.push(website);
            if (linkedin) links.push(`LinkedIn: ${linkedin}`);
            if (github) links.push(`GitHub: ${github}`);

            if (links.length > 0) {
                doc.text(links.join(' | '), doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
                yPosition += 8;
            }

            if (summary) {
                yPosition += 6;
                checkPageBreak(25);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('SUMMARY', margin, yPosition);
                doc.line(margin, yPosition + 2, doc.internal.pageSize.width - margin, yPosition + 2); // Underline
                yPosition += 8;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const splitSummary = doc.splitTextToSize(summary, contentWidth) as string[];
                doc.text(splitSummary, margin, yPosition);
                yPosition += splitSummary.length * lineHeight + 4;
            }
        }

        // Work Experience
        if (resumeData.workExperience && resumeData.workExperience.length > 0) {
            yPosition += 4;
            checkPageBreak(30);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('WORK EXPERIENCE', margin, yPosition);
            doc.line(margin, yPosition + 2, doc.internal.pageSize.width - margin, yPosition + 2);
            yPosition += 8;

            for (const exp of resumeData.workExperience) {
                checkPageBreak(35);

                // Position & Date
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(exp.position, margin, yPosition);

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold'); // Date bold for ATS readability
                const dateRange = exp.current
                    ? `${formatDateForAts(exp.startDate)} - Present`
                    : `${formatDateForAts(exp.startDate)} - ${formatDateForAts(exp.endDate) || 'N/A'}`;
                const dateWidth = doc.getTextWidth(dateRange);
                doc.text(dateRange, doc.internal.pageSize.width - margin - dateWidth, yPosition);
                yPosition += 5;

                // Company & Location
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                const companyText = `${exp.company}${exp.location ? ` | ${exp.location}` : ''}`;
                doc.text(companyText, margin, yPosition);
                yPosition += 6;

                // Show achievements if they exist, otherwise convert description to bullets
                const bulletsToShow = (exp.achievements && exp.achievements.length > 0)
                    ? exp.achievements.filter(b => b && b.trim().length > 0)
                    : convertDescriptionToBullets(exp.description || '');

                if (bulletsToShow.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    for (const bullet of bulletsToShow) {
                        checkPageBreak(linesForBullet(bullet, doc, contentWidth - 5) * lineHeight);
                        const splitBullet = doc.splitTextToSize(bullet, contentWidth - 5) as string[];

                        doc.text('•', margin, yPosition);
                        doc.text(splitBullet, margin + 5, yPosition);
                        yPosition += splitBullet.length * lineHeight;
                    }
                }
                yPosition += 4; // Spacing between items
            }
        }

        // Projects
        if (resumeData.projects && Array.isArray(resumeData.projects) && resumeData.projects.length > 0) {
            yPosition += 4;
            checkPageBreak(30);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('PROJECTS', margin, yPosition);
            doc.line(margin, yPosition + 2, doc.internal.pageSize.width - margin, yPosition + 2);
            yPosition += 8;

            for (const project of resumeData.projects) {
                if (!project) continue;

                checkPageBreak(35);

                // Title & Date
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                const projectTitle = project.title || 'Untitled Project';
                doc.text(projectTitle, margin, yPosition);

                // Date/Links right aligned
                let rightText = '';
                if (project.startDate || project.endDate) {
                    rightText = project.endDate
                        ? `${formatDateForAts(project.startDate) || 'N/A'} - ${formatDateForAts(project.endDate)}`
                        : project.startDate
                            ? `${formatDateForAts(project.startDate)} - Present`
                            : '';
                }
                if (rightText) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    const rightWidth = doc.getTextWidth(rightText);
                    doc.text(rightText, doc.internal.pageSize.width - margin - rightWidth, yPosition);
                }
                yPosition += 5;

                // Tech Stack
                if (project.technologies && Array.isArray(project.technologies) && project.technologies.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'italic');
                    doc.text(`${project.technologies.join(', ')}`, margin, yPosition);
                    yPosition += 6;
                }

                // URLs
                if (project.url || project.githubUrl) {
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    const links = [];
                    if (project.url) links.push(`Live: ${project.url}`);
                    if (project.githubUrl) links.push(`Repo: ${project.githubUrl}`);

                    if (links.length > 0) {
                        doc.text(links.join(' | '), margin, yPosition);
                        yPosition += 5;
                    }
                }

                // Show highlights
                const bulletsToShow = (project.highlights && Array.isArray(project.highlights) && project.highlights.length > 0)
                    ? project.highlights.filter(h => h && h.trim().length > 0)
                    : convertDescriptionToBullets(project.description || '');

                if (bulletsToShow.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    for (const bullet of bulletsToShow) {
                        checkPageBreak(linesForBullet(bullet, doc, contentWidth - 5) * lineHeight);
                        const splitBullet = doc.splitTextToSize(bullet, contentWidth - 5) as string[];
                        doc.text('•', margin, yPosition);
                        doc.text(splitBullet, margin + 5, yPosition);
                        yPosition += splitBullet.length * lineHeight;
                    }
                }
                yPosition += 4;
            }
        }

        // Skills
        if (resumeData.skills && resumeData.skills.length > 0) {
            yPosition += 4;
            checkPageBreak(25);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('TECHNICAL SKILLS', margin, yPosition);
            doc.line(margin, yPosition + 2, doc.internal.pageSize.width - margin, yPosition + 2);
            yPosition += 8;

            doc.setFontSize(10);
            for (const skillCategory of resumeData.skills) {
                checkPageBreak(12);
                doc.setFont('helvetica', 'bold');
                const categoryWidth = doc.getTextWidth(`${skillCategory.category}: `);
                doc.text(`${skillCategory.category}: `, margin, yPosition);

                doc.setFont('helvetica', 'normal');
                const skillsText = skillCategory.skills.join(', ');
                const splitSkills = doc.splitTextToSize(skillsText, contentWidth - categoryWidth) as string[];

                doc.text(splitSkills, margin + categoryWidth, yPosition);
                yPosition += splitSkills.length * lineHeight + 2;
            }
        }

        // Education
        if (resumeData.education && resumeData.education.length > 0) {
            yPosition += 4;
            checkPageBreak(25);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('EDUCATION', margin, yPosition);
            doc.line(margin, yPosition + 2, doc.internal.pageSize.width - margin, yPosition + 2);
            yPosition += 8;

            for (const edu of resumeData.education) {
                checkPageBreak(25);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(edu.institution, margin, yPosition);

                doc.setFontSize(10);
                const dateRange = edu.current
                    ? `${formatDateForAts(edu.startDate)} - Present`
                    : `${formatDateForAts(edu.startDate)} - ${formatDateForAts(edu.endDate) || 'N/A'}`;
                const dateWidth = doc.getTextWidth(dateRange);
                doc.text(dateRange, doc.internal.pageSize.width - margin - dateWidth, yPosition);
                yPosition += 5;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.text(`${edu.degree} in ${edu.field}${edu.gpa ? ` (GPA: ${edu.gpa})` : ''}`, margin, yPosition);
                yPosition += 6;

                if (edu.achievements && edu.achievements.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    for (const achievement of edu.achievements) {
                        if (!achievement || achievement.trim().length === 0) continue;
                        checkPageBreak(linesForBullet(achievement, doc, contentWidth - 5) * lineHeight);
                        const splitAchievement = doc.splitTextToSize(achievement, contentWidth - 5) as string[];
                        doc.text('•', margin, yPosition);
                        doc.text(splitAchievement, margin + 5, yPosition);
                        yPosition += splitAchievement.length * lineHeight;
                    }
                }
                yPosition += 4;
            }
        }

        // Certifications
        if (resumeData.certifications && Array.isArray(resumeData.certifications) && resumeData.certifications.length > 0) {
            yPosition += 4;
            checkPageBreak(25);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('CERTIFICATIONS', margin, yPosition);
            doc.line(margin, yPosition + 2, doc.internal.pageSize.width - margin, yPosition + 2);
            yPosition += 8;

            for (const cert of resumeData.certifications) {
                if (!cert) continue;
                checkPageBreak(20);

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(cert.name, margin, yPosition);

                doc.setFont('helvetica', 'normal');
                const certDate = cert.expiryDate
                    ? `${formatDateForAts(cert.issueDate) || 'N/A'} - ${formatDateForAts(cert.expiryDate)}`
                    : formatDateForAts(cert.issueDate) || 'N/A';

                const dateWidth = doc.getTextWidth(certDate);
                doc.text(certDate, doc.internal.pageSize.width - margin - dateWidth, yPosition);

                yPosition += 5; // Next line for issuer

                // Issuer (Italic)
                doc.setFont('helvetica', 'italic');
                doc.text(cert.issuer, margin, yPosition);

                // ID if exists
                if (cert.credentialId) {
                    const issuerWidth = doc.getTextWidth(cert.issuer);
                    doc.setFont('helvetica', 'normal');
                    doc.text(` | ID: ${cert.credentialId}`, margin + issuerWidth, yPosition);
                }

                if (cert.credentialUrl) {
                    yPosition += 5;
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    const splitUrl = doc.splitTextToSize(`Credential: ${cert.credentialUrl}`, contentWidth) as string[];
                    doc.text(splitUrl, margin, yPosition);
                    yPosition += splitUrl.length * lineHeight - 5;
                }

                yPosition += 6;
            }
        }

        // Custom Sections
        if (resumeData.customSections && resumeData.customSections.length > 0) {
            const sortedCustomSections = [...resumeData.customSections].sort((a, b) => a.order - b.order);
            for (const customSection of sortedCustomSections) {
                yPosition += 6;
                checkPageBreak(25);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(customSection.title.toUpperCase(), margin, yPosition);
                doc.line(margin, yPosition + 2, doc.internal.pageSize.width - margin, yPosition + 2);
                yPosition += 8;

                if (customSection.content) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    const splitContent = doc.splitTextToSize(customSection.content, contentWidth) as string[];
                    doc.text(splitContent, margin, yPosition);
                    yPosition += splitContent.length * lineHeight + 4;
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

// Helper to calculate space needed for a bullet
function linesForBullet(text: string, doc: jsPDF, maxWidth: number): number {
    const splitText = doc.splitTextToSize(text, maxWidth) as string[];
    return splitText.length;
}

// Helper to format date YYYY-MM to MMM YYYY for ATS
function formatDateForAts(dateString: string | undefined): string {
    if (!dateString) return '';
    if (dateString.toLowerCase() === 'present') return 'Present';

    // Try to parse YYYY-MM
    const match = dateString.match(/^(\d{4})-(\d{2})$/);
    if (match && match[1] && match[2]) {
        const year = match[1];
        const month = parseInt(match[2], 10);
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        if (month >= 1 && month <= 12) {
            return `${monthNames[month - 1]} ${year}`;
        }
    }
    // Return original if no match or other format
    return dateString;
}

/**
 * Main export function that routes to appropriate format
 */
/**
 * Main export function that routes to appropriate format
 */
export function exportResume(
    resumeData: ResumeData,
    formatOrOptions: ExportFormat | { format: ExportFormat; isAtsMode?: boolean; headline?: string }
): Promise<Buffer> | Buffer {
    if (!resumeData) {
        throw new Error('Resume data is required for export');
    }

    const format = typeof formatOrOptions === 'string' ? formatOrOptions : formatOrOptions.format;
    const isAtsMode = typeof formatOrOptions === 'object' ? formatOrOptions.isAtsMode : false;
    const headline = typeof formatOrOptions === 'object' ? formatOrOptions.headline : undefined;

    if (!format) {
        throw new Error('Export format is required (PDF or DOCX)');
    }

    switch (format) {
        case 'PDF':
            return exportToPdf(resumeData, !!isAtsMode, headline);
        case 'DOCX':
            // DOCX is already ATS friendly
            return exportToDocx(resumeData, headline);
        default:
            throw new Error(
                `Unsupported export format: ${String(format)}. Supported formats: PDF, DOCX`
            );
    }
}
