// YARA Rule: Detect Suspicious Shell Scripts with Reverse Shell Patterns
//
// Identifies common reverse shell and credential-harvesting patterns
// in shell scripts, Dockerfiles, and cloud-init configurations.
//
// Usage:
//   Import via DetectionEngine:
//     engine.importYaraRule({
//       name: 'Suspicious_Reverse_Shell',
//       meta: { ... },
//       strings: [ ... ],
//       condition: '...'
//     });
//
//   Or load via CLI:
//     si analyze --yara-rule examples/custom-rule/yara-rule.yar scan-results.json

rule Suspicious_Reverse_Shell
{
    meta:
        description = "Detects reverse shell and bind shell patterns in shell scripts"
        author = "Security Intelligence Team"
        severity = "critical"
        date = "2024-03-15"
        version = "1.2"
        tags = "reverse-shell,bind-shell,credential-theft,lateral-movement"
        mitre_tactic = "command-and-control"
        mitre_technique = "T1571"
        reference = "https://attack.mitre.org/techniques/T1571/"

    strings:
        // ── Classic reverse shell patterns ──────────────────────────────
        $bash_tcp = /bash\s+-[ic]\s+['"]?.*\/dev\/tcp\/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\/[0-9]+/ ascii nocase
        $bash_udp = /bash\s+-[ic]\s+['"]?.*\/dev\/udp\/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\/[0-9]+/ ascii nocase
        $nc_reverse = /nc\s+(-[ecl]\s+)?['"]?.*[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\s+[0-9]{2,5}/ ascii nocase
        $ncat_reverse = /ncat\s+.*(-e\s+|--sh-exec\s+|--exec\s+)/ ascii nocase

        // ── Python reverse shells ───────────────────────────────────────
        $python_socket = /socket\.socket\(socket\.AF_INET/ ascii
        $python_subprocess = /subprocess\.call\(['"]?\/bin\/(ba)?sh/ ascii
        $python_os_dup2 = /os\.dup2\(.*\.fileno\(\)/ ascii

        // ── PowerShell download cradles ─────────────────────────────────
        $ps_webclient = /New-Object\s+System\.Net\.WebClient/ ascii nocase
        $ps_iex = /IEX\s*\(\s*\(?\s*New-Object/ ascii nocase
        $ps_downloadstring = /\.DownloadString\(/ ascii nocase

        // ── Credential theft patterns ───────────────────────────────────
        $etc_shadow = /\/etc\/shadow/ ascii
        $etc_passwd = /\/etc\/passwd/ ascii
        $ssh_private_key = /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ ascii
        $aws_creds = /aws_(secret_access_key|access_key_id)\s*=\s*['"]?[A-Za-z0-9\/+=]{20,}/ ascii
        $env_token = /TOKEN|SECRET|PASSWORD|CREDENTIAL/ ascii nocase

        // ── Encoding/obfuscation indicators ─────────────────────────────
        $base64_decode = /(base64\s+--decode|base64\s+-d|openssl\s+enc\s+-d)/ ascii
        $xxd_reverse = /xxd\s+-r/ ascii
        $perl_pack = /perl\s+.*-e\s+.*pack/ ascii nocase

        // ── Persistence mechanisms ──────────────────────────────────────
        $cron_job = /(crontab|cron\.d)\s+.*\*{4,5}/ ascii
        $systemd_timer = /\.timer/ ascii
        $rc_local = /\/etc\/rc\.local/ ascii
        $bash_profile_mod = /\/\.(bashrc|bash_profile|profile)\s*$/ ascii

    condition:
        // Critical: Any reverse shell pattern
        any of ($bash_tcp, $bash_udp, $nc_reverse, $ncat_reverse,
                $python_socket, $python_subprocess, $python_os_dup2,
                $ps_webclient, $ps_iex, $ps_downloadstring) or

        // High: Credential theft with exfiltration
        ($ssh_private_key or $aws_creds) and
        any of ($nc_reverse, $bash_tcp, $python_socket, $base64_decode) or

        // Medium: Suspicious credential access
        ($etc_shadow and $base64_decode) or

        // Medium: Persistence with obfuscation
        any of ($cron_job, $systemd_timer, $rc_local) and
        any of ($base64_decode, $xxd_reverse, $perl_pack)
}
