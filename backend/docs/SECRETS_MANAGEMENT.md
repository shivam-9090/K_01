# Secrets Management Guide

## Production Secrets Best Practices

### 1. Never Commit Secrets

- ✅ `.env` is in `.gitignore`
- ✅ Use `.env.example` as template
- ❌ Never commit actual secrets to Git

### 2. Generate Strong Secrets

```bash
# JWT Secret (minimum 32 characters)
openssl rand -base64 32

# 2FA Encryption Key
openssl rand -base64 32

# Redis Password
openssl rand -base64 24

# Session Secret
openssl rand -base64 32
```

### 3. Secret Rotation Schedule

| Secret             | Rotation Frequency | Priority |
| ------------------ | ------------------ | -------- |
| JWT Secret         | Every 6 months     | HIGH     |
| 2FA Encryption Key | Every 6 months     | HIGH     |
| Database Password  | Every 90 days      | CRITICAL |
| Redis Password     | Every 90 days      | MEDIUM   |
| API Keys           | Every 30 days      | HIGH     |

### 4. Environment-Specific Secrets

```bash
# Development
.env.development

# Staging
.env.staging

# Production
.env.production
```

### 5. Secret Manager Integration

#### AWS Secrets Manager

```typescript
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

async function getSecret(secretName: string) {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName }),
  );
  return JSON.parse(response.SecretString);
}
```

#### Azure Key Vault

```typescript
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

async function getSecret(secretName: string) {
  const credential = new DefaultAzureCredential();
  const url = `https://${vaultName}.vault.azure.net`;
  const client = new SecretClient(url, credential);
  const secret = await client.getSecret(secretName);
  return secret.value;
}
```

### 6. Docker Secrets

```yaml
# docker-compose.yml
services:
  app:
    secrets:
      - jwt_secret
      - db_password

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  db_password:
    file: ./secrets/db_password.txt
```

### 7. Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: auth-secrets
type: Opaque
data:
  jwt-secret: <base64-encoded-secret>
  db-password: <base64-encoded-password>
```

### 8. Secret Validation Checklist

- [ ] All secrets are at least 32 characters
- [ ] No secrets in source control
- [ ] Production secrets differ from development
- [ ] Secrets are encrypted at rest
- [ ] Access to secrets is logged
- [ ] Rotation schedule is documented
- [ ] Team has access recovery process
- [ ] Old secrets are properly revoked

### 9. Emergency Secret Rotation

If a secret is compromised:

1. **Immediate**: Rotate the secret
2. **Within 1 hour**: Update all services
3. **Within 24 hours**: Audit access logs
4. **Within 48 hours**: Document incident

### 10. Monitoring & Alerts

Set up alerts for:

- Failed authentication attempts
- Secret access patterns
- Expiring secrets
- Unusual API usage

## Quick Setup

1. Copy environment template:

```bash
cp .env.example .env
```

2. Generate all secrets:

```bash
# Generate JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# Generate 2FA key
echo "TWOFA_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env

# Generate Redis password
echo "REDIS_PASSWORD=$(openssl rand -base64 24)" >> .env
```

3. Update with your values:

```bash
nano .env
```

4. Verify secrets are not in Git:

```bash
git status
# .env should NOT appear in untracked files
```

## Security Contacts

- Security Team: security@yourcompany.com
- On-Call: +1-XXX-XXX-XXXX
- Incident Response: https://yourcompany.com/security/incident
