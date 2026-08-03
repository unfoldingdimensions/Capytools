'use client';
import { ResumeData } from '@/types/resume.types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

interface ResumePreviewProps {
    data: ResumeData;
    template?: string;
    headline?: string;
}

const ModernIndigo = ({ data, headline }: { data: ResumeData; headline?: string }) => {
    const { personalInfo, workExperience, education, projects, skills, certifications } = data;
    return (
        <div className="bg-white text-gray-800 font-sans leading-relaxed h-full p-10">
            <header className="border-b-4 border-brand-600 pb-8 mb-8 text-center">
                <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-4">
                    {personalInfo?.fullName || 'Your Name'}
                </h1>
                {headline && (
                    <p className="text-base font-semibold text-brand-600 uppercase tracking-wider mb-4">
                        {headline}
                    </p>
                )}
                <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-gray-600">
                    {personalInfo?.email && (
                        <div className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-brand-600" /><span>{personalInfo.email}</span></div>
                    )}
                    {personalInfo?.phone && (
                        <div className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-brand-600" /><span>{personalInfo.phone}</span></div>
                    )}
                    {personalInfo?.location && (
                        <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-brand-600" /><span>{personalInfo.location}</span></div>
                    )}
                </div>
                {/* Socials */}
                <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {personalInfo?.website && <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /><span>{personalInfo.website}</span></div>}
                    {personalInfo?.linkedin && <div className="flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5" /><span>LinkedIn</span></div>}
                    {personalInfo?.github && <div className="flex items-center gap-1.5"><Github className="w-3.5 h-3.5" /><span>GitHub</span></div>}
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 space-y-8">
                    {personalInfo?.summary && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 mb-4 pb-1">Professional Summary</h2>
                            <p className="text-sm text-gray-700 leading-relaxed italic">"{personalInfo.summary}"</p>
                        </section>
                    )}
                    {workExperience && workExperience.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 mb-4 pb-1">Work Experience</h2>
                            <div className="space-y-6">
                                {workExperience.map((exp, idx) => (
                                    <div key={idx} className="relative pl-4 border-l-2 border-brand-50">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-gray-900">{exp.position}</h3>
                                            <span className="text-[10px] font-bold text-brand-600 uppercase bg-brand-50 px-2 py-0.5 rounded">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                                        </div>
                                        <div className="text-sm font-semibold text-gray-600 mb-2">{exp.company}{exp.location && ` • ${exp.location}`}</div>
                                        <ul className="list-disc list-outside ml-4 space-y-1">
                                            {exp.achievements?.map((ach, aIdx) => <li key={aIdx} className="text-sm text-gray-700">{ach}</li>)}
                                            {!exp.achievements?.length && exp.description && <p className="text-sm text-gray-700 whitespace-pre-wrap">{exp.description}</p>}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    {projects && projects.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 mb-4 pb-1">Key Projects</h2>
                            <div className="space-y-6">
                                {projects.map((proj, idx) => (
                                    <div key={idx} className="relative pl-4 border-l-2 border-brand-50">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-gray-900">{proj.title}</h3>
                                            {proj.url && <span className="text-[10px] text-brand-600 font-medium lowercase italic underline">{proj.url}</span>}
                                        </div>
                                        <ul className="list-disc list-outside ml-4 space-y-1 mb-2">
                                            {proj.highlights?.map((high, hIdx) => <li key={hIdx} className="text-sm text-gray-700">{high}</li>)}
                                            {!proj.highlights?.length && proj.description && <p className="text-sm text-gray-700">{proj.description}</p>}
                                        </ul>
                                        {proj.technologies && proj.technologies.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {proj.technologies.map((tech, tIdx) => <span key={tIdx} className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded uppercase">{tech}</span>)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
                <div className="col-span-4 space-y-8">
                    {skills && skills.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 mb-4 pb-1">Skills</h2>
                            <div className="space-y-4">
                                {skills.map((skillGroup, idx) => (
                                    <div key={idx}>
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{skillGroup.category}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {skillGroup.skills.map((skill, sIdx) => <span key={sIdx} className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded shadow-sm">{skill}</span>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    {education && education.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 mb-4 pb-1">Education</h2>
                            <div className="space-y-5">
                                {education.map((edu, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <h3 className="text-sm font-bold text-gray-900">{edu.degree}</h3>
                                        <p className="text-xs font-semibold text-brand-700">{edu.institution}</p>
                                        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            <span>{edu.field}</span>
                                            <span>{edu.startDate?.split('-')[0]} - {edu.current ? 'Present' : edu.endDate?.split('-')[0]}</span>
                                        </div>
                                        {edu.gpa && <p className="text-[10px] font-medium text-brand-600 italic">GPA: {edu.gpa}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    {certifications && certifications.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 mb-4 pb-1">Certifications</h2>
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
        </div>
    );
};

const ObsidianNight = ({ data, headline }: { data: ResumeData; headline?: string }) => {
    const { personalInfo, workExperience, education, skills } = data;
    return (
        <div className="bg-slate-900 text-slate-300 font-sans leading-relaxed h-full p-10">
            <header className="bg-slate-950 p-8 mb-8 flex flex-row justify-between items-center border-b border-slate-800 rounded-xl">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">{personalInfo?.fullName || 'Your Name'}</h1>
                    {headline && (
                        <p className="text-brand-400 font-semibold uppercase tracking-wider mb-1">{headline}</p>
                    )}
                    <p className="text-brand-400 font-medium">{personalInfo?.email} • {personalInfo?.phone}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                    {personalInfo?.location && <p>{personalInfo.location}</p>}
                    {personalInfo?.linkedin && <p>LinkedIn</p>}
                </div>
            </header>
            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 space-y-8">
                    {personalInfo?.summary && (
                        <section>
                            <h3 className="text-lg font-bold text-white mb-4 border-l-4 border-brand-500 pl-3">PROFILE</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">{personalInfo.summary}</p>
                        </section>
                    )}
                    {workExperience && workExperience.length > 0 && (
                        <section>
                            <h3 className="text-lg font-bold text-white mb-6 border-l-4 border-brand-500 pl-3">EXPERIENCE</h3>
                            <div className="space-y-8">
                                {workExperience.map((exp, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between mb-1">
                                            <h4 className="text-white font-bold">{exp.position}</h4>
                                            <span className="text-xs text-slate-500">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</span>
                                        </div>
                                        <p className="text-sm text-brand-400 mb-3">{exp.company}</p>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-400">
                                            {exp.achievements?.map((ach, j) => <li key={j}>{ach}</li>)}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
                <div className="col-span-4 space-y-8 border-l border-slate-800 pl-8">
                    {skills && (
                        <section>
                            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Skills</h3>
                            {skills.map((grp, i) => (
                                <div key={i} className="mb-4">
                                    <p className="text-xs text-brand-500 font-bold mb-2">{grp.category}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {grp.skills.map((s, j) => <span key={j} className="bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded">{s}</span>)}
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}
                    {education && (
                        <section>
                            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Education</h3>
                            {education.map((edu, i) => (
                                <div key={i} className="mb-3">
                                    <p className="text-white text-sm font-bold">{edu.degree}</p>
                                    <p className="text-xs text-slate-500">{edu.institution}</p>
                                </div>
                            ))}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

const MinimalistPro = ({ data, headline }: { data: ResumeData; headline?: string }) => {
    const { personalInfo, workExperience, education, skills } = data;
    return (
        <div className="bg-white text-black font-serif leading-relaxed h-full p-10">
            <header className="border-b-2 border-black pb-8 mb-8">
                <h1 className="text-4xl font-bold mb-4">{personalInfo?.fullName || 'Your Name'}</h1>
                {headline && (
                    <p className="text-base font-semibold uppercase tracking-wider mb-4">{headline}</p>
                )}
                <div className="flex justify-between text-sm italic">
                    <div className="space-x-4">
                        <span>{personalInfo?.email}</span>
                        <span>{personalInfo?.phone}</span>
                    </div>
                    <div>{personalInfo?.location}</div>
                </div>
            </header>

            <div className="space-y-8">
                {personalInfo?.summary && (
                    <section>
                        <h2 className="text-base font-bold border-b border-gray-300 mb-3 pb-1 uppercase tracking-wide">Summary</h2>
                        <p className="text-sm">{personalInfo.summary}</p>
                    </section>
                )}

                {workExperience && workExperience.length > 0 && (
                    <section>
                        <h2 className="text-base font-bold border-b border-gray-300 mb-4 pb-1 uppercase tracking-wide">Experience</h2>
                        <div className="space-y-6">
                            {workExperience.map((exp, i) => (
                                <div key={i}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-base">{exp.company}</h3>
                                        <span className="text-sm">{exp.startDate} – {exp.current ? 'Present' : exp.endDate}</span>
                                    </div>
                                    <p className="italic text-sm mb-2">{exp.position}</p>
                                    <ul className="list-disc list-outside ml-5 space-y-1">
                                        {exp.achievements?.map((ach, j) => <li key={j} className="text-sm">{ach}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {education && education.length > 0 && (
                    <section>
                        <h2 className="text-base font-bold border-b border-gray-300 mb-4 pb-1 uppercase tracking-wide">Education</h2>
                        <div className="space-y-4">
                            {education.map((edu, i) => (
                                <div key={i} className="flex justify-between mb-2">
                                    <div className="text-sm"><span className="font-bold">{edu.institution}</span>, {edu.degree}</div>
                                    <span className="text-sm">{edu.endDate?.split('-')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {skills && (
                    <section>
                        <h2 className="text-base font-bold border-b border-gray-300 mb-3 pb-1 uppercase tracking-wide">Skills</h2>
                        <p className="text-sm leading-relaxed">
                            {skills.flatMap(g => g.skills).join(' • ')}
                        </p>
                    </section>
                )}
            </div>
        </div>
    );
};

export const ResumePreview = ({ data, template = 'modern-indigo', headline }: ResumePreviewProps) => {
    return (
        <div className="bg-white shadow-2xl mx-auto w-full max-w-[800px] min-h-[1100px] overflow-hidden">
            {template === 'sleek-dark' ? (
                <ObsidianNight data={data} headline={headline} />
            ) : template === 'minimalist-pro' ? (
                <MinimalistPro data={data} headline={headline} />
            ) : (
                <ModernIndigo data={data} headline={headline} />
            )}

            <footer className="py-4 text-center border-t border-gray-100 bg-gray-50/50">
                <p className="text-[8px] font-bold text-gray-300 uppercase tracking-[0.2em]">Generated by Handcraft AI</p>
            </footer>
        </div>
    );
};
