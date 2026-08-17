import hashlib
from app.database import SessionLocal, Base, engine
from app.models import User, Organization, OrganizationMember, Team, TeamMember, Project, Provider, ModelCatalog, ApiKey, RequestLog
from app.logging_config import logger

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check providers seed count
        if db.query(Provider).count() >= 8:
            logger.info("Database already fully seeded with 8 providers.")
            return

        logger.info("Seeding database with 8 supported LLM providers and model catalog...")

        # 1. Admin User (Owner)
        admin = db.query(User).filter(User.email == "admin@whitegator.ai").first()
        if not admin:
            admin_salt = "whitegater_salt_2026"
            admin_pass_hash = f"{admin_salt}:" + hashlib.sha256((admin_salt + "admin123").encode()).hexdigest()
            admin = User(
                email="admin@whitegator.ai",
                password_hash=admin_pass_hash,
                full_name="WhiteGator Admin",
                role="SUPER_ADMIN",
                status="active"
            )
            db.add(admin)
            db.flush()

        # 2. Default Organization
        org = db.query(Organization).filter(Organization.slug == "whitegator-core").first()
        if not org:
            org = Organization(
                name="WhiteGator Core Org",
                slug="whitegator-core",
                owner_id=admin.id
            )
            db.add(org)
            db.flush()

            org_member = OrganizationMember(
                organization_id=org.id,
                user_id=admin.id,
                role="owner"
            )
            db.add(org_member)
            db.flush()

            team = Team(
                organization_id=org.id,
                name="Engineering Team",
                description="Core Infrastructure Team"
            )
            db.add(team)
            db.flush()

            project = Project(
                organization_id=org.id,
                team_id=team.id,
                name="Production Gateway",
                description="Primary AI Gateway Service"
            )
            db.add(project)
            db.flush()

        # 3. Eight Supported Initial Providers
        providers_data = [
            {"code": "openai", "name": "OpenAI", "url": "https://api.openai.com/v1", "custom": False},
            {"code": "anthropic", "name": "Anthropic", "url": "https://api.anthropic.com/v1", "custom": False},
            {"code": "gemini", "name": "Google Gemini", "url": "https://generativelanguage.googleapis.com/v1beta", "custom": False},
            {"code": "azure", "name": "Azure OpenAI", "url": "https://{resource}.openai.azure.com/openai", "custom": False},
            {"code": "groq", "name": "Groq", "url": "https://api.groq.com/openai/v1", "custom": False},
            {"code": "openrouter", "name": "OpenRouter", "url": "https://openrouter.ai/api/v1", "custom": False},
            {"code": "ollama", "name": "Ollama Local", "url": "http://localhost:11434/v1", "custom": False},
            {"code": "custom", "name": "Custom OpenAI-Compatible", "url": "http://localhost:8000/v1", "custom": True}
        ]
        
        provider_map = {}
        for p in providers_data:
            prov = db.query(Provider).filter(Provider.provider_code == p["code"]).first()
            if not prov:
                prov = Provider(
                    provider_code=p["code"],
                    name=p["name"],
                    base_url=p["url"],
                    is_custom=p["custom"]
                )
                db.add(prov)
                db.flush()
            provider_map[p["code"]] = prov.id

        # 4. Standard Model Catalog & WhiteGator Aliases
        models_data = [
            {"code": "gpt-4o", "name": "OpenAI GPT-4o", "prov": "openai", "p_cost": 2.50, "c_cost": 10.00, "alias": "whitegator-smart"},
            {"code": "gpt-4o-mini", "name": "OpenAI GPT-4o Mini", "prov": "openai", "p_cost": 0.15, "c_cost": 0.60, "alias": "whitegator-fast"},
            {"code": "claude-3-5-sonnet", "name": "Anthropic Claude 3.5 Sonnet", "prov": "anthropic", "p_cost": 3.00, "c_cost": 15.00, "alias": "whitegator-code"},
            {"code": "gemini-1.5-flash", "name": "Google Gemini 1.5 Flash", "prov": "gemini", "p_cost": 0.075, "c_cost": 0.30, "alias": "whitegator-cheap"},
            {"code": "gemini-1.5-pro", "name": "Google Gemini 1.5 Pro", "prov": "gemini", "p_cost": 1.25, "c_cost": 5.00, "alias": "vision-model"},
            {"code": "llama-3.3-70b", "name": "Groq Llama 3.3 70B", "prov": "groq", "p_cost": 0.50, "c_cost": 0.80, "alias": "groq-fast"},
            {"code": "qwen-2.5-72b", "name": "OpenRouter Qwen 2.5 72B", "prov": "openrouter", "p_cost": 0.35, "c_cost": 0.40, "alias": "openrouter-qwen"},
            {"code": "llama3.2", "name": "Ollama Llama 3.2 Local", "prov": "ollama", "p_cost": 0.00, "c_cost": 0.00, "alias": "local-model"},
        ]
        for m in models_data:
            existing_m = db.query(ModelCatalog).filter(ModelCatalog.model_code == m["code"]).first()
            if not existing_m and m["prov"] in provider_map:
                existing_m = ModelCatalog(
                    provider_id=provider_map[m["prov"]],
                    model_code=m["code"],
                    display_name=m["name"],
                    model_alias=m["alias"],
                    input_cost_per_1m=m["p_cost"],
                    output_cost_per_1m=m["c_cost"],
                    context_window=128000,
                    capabilities={"streaming": True, "vision": True if "vision" in m["alias"] else False, "tools": True, "json_mode": True}
                )
                db.add(existing_m)
            elif existing_m:
                existing_m.model_alias = m["alias"]

        db.commit()
        logger.info("Database seeding complete.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {str(e)}")
    finally:
        db.close()
