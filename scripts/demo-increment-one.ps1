param(
    [string]$Api = 'http://127.0.0.1:8080'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds(15)
$created = [System.Collections.Generic.List[string]]::new()
$checks = 0

function Send-Check {
    param([string]$Method, [string]$Url, [int]$Expected, $Body = $null)
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($Method), $Url)
    $response = $null
    try {
        if ($null -ne $Body) {
            $json = ConvertTo-Json -InputObject $Body -Depth 10 -Compress
            $request.Content = [System.Net.Http.StringContent]::new($json, [Text.Encoding]::UTF8, 'application/json')
        }
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        if ([int]$response.StatusCode -ne $Expected) {
            throw "$Method $Url expected $Expected, got $([int]$response.StatusCode): $content"
        }
        $script:checks++
        Write-Host ("PASS {0} {1} -> {2}" -f $Method, $Url, $Expected)
        if ($content) { return ConvertFrom-Json -InputObject $content }
    }
    finally {
        if ($null -ne $response) { $response.Dispose() }
        $request.Dispose()
    }
}

function Assert-Value {
    param($Actual, $Expected, [string]$Label)
    if ($Actual -ne $Expected) { throw "$Label expected '$Expected', got '$Actual'" }
}

try {
    foreach ($base in @($Api)) {
        if (-not ([Uri]$base).IsLoopback) { throw 'Use local classroom services for this demo.' }
    }
    $Api = $Api.TrimEnd('/')
    $suffix = [Guid]::NewGuid().ToString('N')
    $userBody = @{ name = 'Increment One Student'; email = "demo-$suffix@example.com"; password = 'classroom123'; role = 'STUDENT' }
    $user = Send-Check POST "$Api/api/users" 201 $userBody
    $userUrl = "$Api/api/users/$($user.userId)"
    $created.Add($userUrl)
    $null = Send-Check GET "$Api/api/users" 200
    $null = Send-Check GET $userUrl 200
    $userBody.name = 'Updated Student'
    $user = Send-Check PUT $userUrl 200 $userBody
    Assert-Value $user.name 'Updated Student' 'User update'

    $flowBody = @{ userId = $user.userId; title = 'Biology recall'; description = 'Increment 1'; isPublic = $false }
    $invalidFlow = $flowBody.Clone()
    $invalidFlow.userId = 999999999
    $null = Send-Check POST "$Api/api/flows" 404 $invalidFlow
    $flow = Send-Check POST "$Api/api/flows" 201 $flowBody
    $flowUrl = "$Api/api/flows/$($flow.flowId)"
    $created.Add($flowUrl)
    $null = Send-Check GET "$Api/api/flows" 200
    $null = Send-Check GET $flowUrl 200
    $flowBody.title = 'Updated recall'
    $flow = Send-Check PUT $flowUrl 200 $flowBody
    Assert-Value $flow.title 'Updated recall' 'Flow update'

    $typeBody = @{ title = 'Active recall'; description = 'Retrieve from memory'; scientificBasis = 'Retrieval practice'; defaultDuration = 25 }
    $type = Send-Check POST "$Api/api/studytypes" 201 $typeBody
    $typeUrl = "$Api/api/studytypes/$($type.studyTypeId)"
    $created.Add($typeUrl)
    $null = Send-Check GET "$Api/api/studytypes" 200
    $null = Send-Check GET $typeUrl 200
    $typeBody.defaultDuration = 20
    $type = Send-Check PUT $typeUrl 200 $typeBody
    Assert-Value $type.defaultDuration 20 'Study type update'

    $blockBody = @{ flowId = $flow.flowId; studyTypeId = $type.studyTypeId; sequenceOrder = 0; durationMinutes = 25; customInstruction = 'Practice questions' }
    $block = Send-Check POST "$Api/api/blocks" 201 $blockBody
    $blockUrl = "$Api/api/blocks/$($block.blockId)"
    $created.Add($blockUrl)
    $null = Send-Check GET "$Api/api/blocks?flowId=$($flow.flowId)" 200
    $null = Send-Check GET $blockUrl 200
    $blockBody.durationMinutes = 20
    $block = Send-Check PUT $blockUrl 200 $blockBody
    Assert-Value $block.durationMinutes 20 'Block update'
    $null = Send-Check POST "$Api/api/blocks" 409 $blockBody
    $null = Send-Check DELETE $flowUrl 409
    $null = Send-Check DELETE $typeUrl 409

    $sessionBody = @{ id = "demo-$suffix"; userId = $user.userId; flowId = $flow.flowId; flowTitle = $flow.title; flowTag = 'Biology'; startedAt = [DateTime]::UtcNow.AddHours(-2).ToString('o'); durationMinutes = 30; focusMinutes = 25; subject = 'Biology'; status = 'completed' }
    $invalidSession = $sessionBody.Clone()
    $invalidSession.flowId = 999999999
    $null = Send-Check POST "$Api/api/sessions" 404 $invalidSession
    $session = Send-Check POST "$Api/api/sessions" 201 $sessionBody
    $sessionUrl = "$Api/api/sessions/$($session.id)?userId=$($user.userId)"
    $created.Add($sessionUrl)
    if ($null -eq $session.endedAt) { throw 'Session end time missing' }
    $null = Send-Check DELETE $flowUrl 409
    $null = Send-Check DELETE $userUrl 409
    $null = Send-Check POST "$Api/api/sessions" 200 $sessionBody
    $null = Send-Check GET "$Api/api/sessions?userId=$($user.userId)" 200
    $null = Send-Check GET $sessionUrl 200
    $sessionBody.subject = 'Physics'
    $session = Send-Check PUT $sessionUrl 200 $sessionBody
    Assert-Value $session.subject 'Physics' 'Session update'

    $logUrl = "$Api/api/sessions/$($session.id)/log?userId=$($user.userId)"
    $logBody = @{ comprehension = 4; fatigue = 2; notes = 'Useful practice' }
    $log = Send-Check POST $logUrl 201 $logBody
    if ($null -eq $log.logId -or $null -eq $log.loggedAt) { throw 'Log metadata missing' }
    $null = Send-Check POST $logUrl 409 $logBody
    $null = Send-Check GET $logUrl 200
    $logBody.notes = 'Updated reflection'
    $session = Send-Check PUT $logUrl 200 $logBody
    Assert-Value $session.reflection.notes 'Updated reflection' 'Log update'
    $null = Send-Check DELETE $logUrl 204
    $null = Send-Check GET $logUrl 404

    foreach ($url in @($sessionUrl, $blockUrl, $typeUrl, $flowUrl, $userUrl)) {
        $null = Send-Check DELETE $url 204
        $null = Send-Check GET $url 404
        $null = $created.Remove($url)
    }
    Write-Host "All six entities passed CRUD ($checks HTTP checks). Demo records removed."
}
finally {
    for ($index = $created.Count - 1; $index -ge 0; $index--) {
        try { $null = Send-Check DELETE $created[$index] 204 }
        catch { Write-Warning "Demo cleanup failed for $($created[$index]): $_" }
    }
    $client.Dispose()
}
