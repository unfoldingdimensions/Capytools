'use client';
import { ResumeData } from '@/types/resume.types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

interface ResumePreviewProps {
    data: ResumeData;
}

export const ResumePreview = ({ data }: ResumePreviewProps) => {
    const { personalInfo, workExperience, education, projects, skills, certifications } = data;

    return (
        <div className="bg-white shadow-2xl mx-auto w-full max-w-[800px] min-h-[1100px] p-12 text-gray-800 font-sans leading-relaxed">
            {/* Header Section */}
            <header className="border-b-4 border-brand-600 pb-8 mb-8 text-center">
                <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-4">
                    {personalInfo?.fullName || 'Your Name'}
                </h1>

                <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-gray-600">
                    {personalInfo?.email && (
                        <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-brand-600" />
                            <span>{personalInfo.email}</span>
                        </div>
                    )}
                    {personalInfo?.phone && (
                        <div className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4 text-brand-600" />
                            <span>{personalInfo.phone}</span>
                        </div>
                    )}
                    {personalInfo?.location && (
                        <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-brand-600" />
                            <span>{personalInfo.location}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {personalInfo?.website && (
                        <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5" />
                            <span>{personalInfo.website}</span>
                        </div>
                    )}
                    {personalInfo?.linkedin && (
                        <div className="flex items-center gap-1.5">
                            <Linkedin className="w-3.5 h-3.5" />
                            <span>LinkedIn</span>
                        </div>
                    )}
                    {personalInfo?.github && (
                        <div className="flex items-center gap-1.5">
                            <Github className="w-3.5 h-3.5" />
                            <span>GitHub</span>
                        </div>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-12 gap-10">
                {/* Main Content */}
                <div className="col-span-8 space-y-10">
                    {/* Summary */}
                    {personalInfo?.summary && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 mb-4 pb-1">
                                Professional Summary
                            </h2>
                            <p className="text-sm text-gray-700 leading-relaxed italic">
                                "{personalInfo.summary}"
                            </p>
                        </section>
                    )}

                    {/* Experience */}
                    {workExperience && workExperience.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 mb-4 pb-1">
                                Work Experience
                            </h2>
                            <div className="space-y-6">
                                {workExperience.map((exp, idx) => (
                                    <div key={idx} className="relative pl-4 border-l-2 border-brand-50">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-gray-900">{exp.position}</h3>
                                            <span className="text-[10px] font-bold text-brand-600 uppercase bg-brand-50 px-2 py-0.5 rounded">
                                                {exp.startDate} — {exp.current ? 'Present' : exp.endDate}
                                            </span>
                                        </div>
                                        <div className="text-sm font-semibold text-gray-600 mb-2">
                                            {exp.company}{exp.location && ` • ${exp.location}`}
                                        </div>
                                        <ul className="list-disc list-outside ml-4 space-y-1">
                                            {exp.achievements?.map((ach, aIdx) => (
                                                <li key={aIdx} className="text-sm text-gray-700">{ach}</li>
                                            ))}
                                            {!exp.achievements?.length && exp.description && (
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{exp.description}</p>
                                            )}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Projects */}
                    {projects && projects.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 mb-4 pb-1">
                                Key Projects
                            </h2>
                            <div className="space-y-6">
                                {projects.map((proj, idx) => (
                                    <div key={idx} className="relative pl-4 border-l-2 border-indigo-50">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-gray-900">{proj.title}</h3>
                                            {proj.url && <span className="text-[10px] text-indigo-600 font-medium lowercase italic underline">{proj.url}</span>}
                                        </div>
                                        <ul className="list-disc list-outside ml-4 space-y-1 mb-2">
                                            {proj.highlights?.map((high, hIdx) => (
                                                <li key={hIdx} className="text-sm text-gray-700">{high}</li>
                                            ))}
                                            {!proj.highlights?.length && proj.description && (
                                                <p className="text-sm text-gray-700">{proj.description}</p>
                                            )}
                                        </ul>
                                        {proj.technologies && proj.technologies.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {proj.technologies.map((tech, tIdx) => (
                                                    <span key={tIdx} className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded uppercase">
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Sidebar Content */}
                <div className="col-span-4 space-y-10">
                    {/* Skills */}
                    {skills && skills.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 mb-4 pb-1">
                                Skills
                            </h2>
                            <div className="space-y-4">
                                {skills.map((skillGroup, idx) => (
                                    <div key={idx}>
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                            {skillGroup.category}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {skillGroup.skills.map((skill, sIdx) => (
                                                <span key={sIdx} className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded shadow-sm">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Education */}
                    {education && education.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 mb-4 pb-1">
                                Education
                            </h2>
                            <div className="space-y-5">
                                {education.map((edu, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <h3 className="text-sm font-bold text-gray-900">{edu.degree}</h3>
                                        <p className="text-xs font-semibold text-brand-700">{edu.institution}</p>
                                        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            <span>{edu.field}</span>
                                            <span>{edu.startDate?.split('-')[0]} - {edu.current ? 'Present' : edu.endDate?.split('-')[0]}</span>
                                        </div>
                                        {edu.gpa && <p className="text-[10px] font-medium text-emerald-600 italic">GPA: {edu.gpa}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Certifications */}
                    {certifications && certifications.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 mb-4 pb-1">
                                Certifications
                            </h2>
                            <div className="space-y-4">
                                {certifications.map((cert, idx) => (
                                    <div key={idx} className="space-y-0.5">
                                        <h3 className="text-xs font-bold text-gray-900 leading-snug">{cert.name}</h3>
                                        <p className="text-[10px] font-medium text-gray-500 uppercase">{cert.issuer}</p>
                                        <p className="text-[10px] font-bold text-gray-400">{cert.issueDate?.split('-')[0]}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* Footer / Contact Repeat or Simple Sign-off */}
            <footer className="mt-16 pt-8 border-t border-gray-100 text-center">
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">
                    Generated by Handcraft AI Resume Builder
                </p>
            </footer>
        </div>
    );
};
