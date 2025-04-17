# The aim of this script is to create an app registration that 
# we will use to sign in as an app using cert and password
# and for now will allow to manage SharePoint stuff 

Write-Host "Generating self-signed certificate..."
openssl genrsa -out privateKey.key 2048
openssl req -new -key privateKey.key -out request.csr
openssl x509 -req -days 365 -in request.csr -signkey privateKey.key -out "temp/certificate.cer"
openssl pkcs12 -export -out "temp/certificate.pfx" -inkey privateKey.key -in "temp/certificate.cer"
$pfxBytes = Get-Content "temp/certificate.pfx" -AsByteStream -Raw
[System.Convert]::ToBase64String($pfxBytes) | Out-File "temp/CertificateBase64String.txt"

Write-Host "Creating an app registration..."
$app = m365 entra app add --name "MCP Server Test" --apisApplication "https://graph.microsoft.com/Sites.FullControl.All,https://microsoft.sharepoint-df.com/Sites.FullControl.All" --certificateFile ./temp/certificate.cer --certificateDisplayName "certificate" --grantAdminConsent --output "json"
$app