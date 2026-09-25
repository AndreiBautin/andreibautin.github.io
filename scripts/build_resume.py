"""Generate the public one-page resume. Requires reportlab; no PDF overlays."""
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.pagesizes import letter

ROOT = Path(__file__).resolve().parents[1]
NAVY = colors.HexColor('#203c60')
BODY = colors.HexColor('#263342')
styles = {
    'name': ParagraphStyle('name', fontName='Helvetica-Bold', fontSize=22, leading=26, textColor=NAVY, alignment=TA_CENTER, spaceAfter=4),
    'title': ParagraphStyle('title', fontName='Helvetica', fontSize=10.5, leading=14, alignment=TA_CENTER, textColor=BODY, spaceAfter=4),
    'contact': ParagraphStyle('contact', fontName='Helvetica', fontSize=9, leading=12, alignment=TA_CENTER, textColor=BODY, spaceAfter=9),
    'section': ParagraphStyle('section', fontName='Helvetica-Bold', fontSize=10.5, leading=13, textColor=NAVY, spaceBefore=9, spaceAfter=4),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=9.5, leading=12.4, textColor=BODY, spaceAfter=4),
    'role': ParagraphStyle('role', fontName='Helvetica-Bold', fontSize=9.8, leading=13, textColor=NAVY, spaceBefore=5, spaceAfter=3),
    'bullet': ParagraphStyle('bullet', fontName='Helvetica', fontSize=9.5, leading=12.4, textColor=BODY, leftIndent=9, firstLineIndent=-9, spaceAfter=4),
}
story = []
def p(text, kind='body'):
    story.append(Paragraph(text, styles[kind]))
def section(title):
    p(title, 'section')
    story.append(HRFlowable(width='100%', thickness=.6, color=NAVY, spaceAfter=5))
def bullet(text):
    p('- ' + text, 'bullet')

p('Andrei Bautin', 'name')
p('Senior Software Engineer | .NET | Azure | React', 'title')
p('Denver, CO | <link href="mailto:andreibautin94@gmail.com">andreibautin94@gmail.com</link> | (913) 827-6855<br/>'
  '<link href="https://www.linkedin.com/in/andrei-bautin-0b2578184/">LinkedIn</link> | '
  '<link href="https://github.com/AndreiBautin">GitHub</link> | '
  '<link href="https://andreibautin.github.io/">andreibautin.github.io</link>', 'contact')
section('SUMMARY')
p('Senior software engineer with 7+ years building enterprise applications in C#, .NET, React, and Azure. Owns architecture and delivery across development, QA, and production, with experience in retrieval-augmented generation (RAG), asynchronous messaging, observability, and technical mentorship.')
section('PROFESSIONAL EXPERIENCE')
p('3Cloud, a Cognizant Company <font name="Helvetica">(formerly Brainspire Solutions) | Denver, CO</font>', 'role')
p('Senior Software Engineer <font name="Helvetica">| September 2024 - Present</font>', 'role')
bullet('Inherited a delayed Azure RAG platform, stabilized its architecture, and led it to a production-ready release for natural-language queries over engineering documentation.')
bullet('Designed the knowledge assistant with Azure OpenAI, Azure AI Search, Blob Storage, React/TypeScript, and .NET. Owned architecture across development, QA, and production; added Application Insights, alerts, and traces to diagnose stabilization issues.')
bullet('Replaced serialized data replication with an asynchronous Azure Service Bus design to improve throughput, using telemetry and alerts to monitor replication completeness.')
bullet('Delivered features and production fixes for enterprise tax and audit applications. Mentored and onboarded 5+ engineers through code reviews, architecture guidance, and shared standards.')
p('Software Engineer <font name="Helvetica">| June 2019 - September 2024</font>', 'role')
bullet('Built .NET, Vue.js, React, SQL Server, and Azure solutions across healthcare, insurance, retail, and industrial clients, from requirements and architecture through deployment and production support.')
bullet('Automated payment-processing workflows that eliminated more than 11 hours of manual work per day; modernized legacy applications and delivered internal tools for task management and operations.')
section('SELECTED PROJECTS')
p('<link href="https://github.com/AndreiBautin/dj-visualizer-generator">DJ Visualizer Generator</link> <font name="Helvetica">| .NET, React, TypeScript, FFmpeg | <link href="https://dj-visualizer.onrender.com/">Live demo</link></font>', 'role')
bullet('Built an asynchronous audio-to-video pipeline that encodes one animation cycle and reuses it. Includes a bounded file-backed job queue, upload validation, expiring downloads, and real FFmpeg tests.')
p('<link href="https://github.com/AndreiBautin/LifeOS">LifeOS</link> <font name="Helvetica">| React, TypeScript, IndexedDB, PWA | <link href="https://andreibautin.github.io/LifeOS/">Live demo</link></font>', 'role')
bullet('Built a client-side productivity system with shared domain rules, deterministic training logic, lint-enforced architecture boundaries, and optional Firestore sync. Public demo uses generated data.')
section('TECHNICAL SKILLS')
p('<b>Languages &amp; frameworks:</b> C#, TypeScript, JavaScript, SQL, ASP.NET Core, Entity Framework Core, React, Next.js, Vue.js, Blazor<br/>'
  '<b>Cloud &amp; delivery:</b> Azure OpenAI, AI Search, Service Bus, Functions, App Service, Blob Storage, Key Vault, Application Insights, Azure DevOps, GitHub Actions, Docker, CI/CD<br/>'
  '<b>Data:</b> SQL Server, PostgreSQL, MySQL, Cosmos DB')
section('EDUCATION & CERTIFICATIONS')
p('<b>Colorado State University</b> | B.S., Applied Computing Technology | May 2019<br/>'
  '<b>Microsoft:</b> Azure Fundamentals (AZ-900) | Azure AI Fundamentals (AI-900)')
doc = SimpleDocTemplate(str(ROOT / 'dist/Andrei_Bautin_Resume.pdf'), pagesize=letter,
    leftMargin=40, rightMargin=40, topMargin=30, bottomMargin=30,
    title='Andrei Bautin - Senior Software Engineer', author='Andrei Bautin')
doc.build(story)
