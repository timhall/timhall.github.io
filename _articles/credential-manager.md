---
title: VBA Credential Manager
draft: true
---

One of the most common questions I've received with my work on VBA-Web is where can sensitive user information that is needed to connect with APIs be stored with VBA?
This is a complex problem (I'd say one of the more complex in computing) and there has been no real answer for this.
The simplest and safest approach will always be __don't store sensitive user information__.
Unfortunately, the pain point of having to log into multiple services every time you open a workbook is real and has most likely led to many different custom solutions (of varying levels of security).

I'm proposing __VBA Credential Manager__ as a way to solve the problem of storing sensitive user information with VBA.

## Design Goals

1. Secure (this is obvious)
2. Compatible with Windows and Mac
3. Accessible from VBA

There are native approaches to storing sensitive data on both platforms, 
[Password Vault](https://docs.microsoft.com/en-us/uwp/api/Windows.Security.Credentials.PasswordVault) on Windows and 
[Keychain](https://developer.apple.com/library/content/documentation/Security/Conceptual/keychainServConcepts/01introduction/introduction.html) on Mac.
It is difficult-to-impossible to work with these services from VBA and they may also [present their own security issues](http://www.hanselman.com/blog/SavingAndRetrievingBrowserAndOtherPasswords.aspx).
For a custom solution, here is the proposed approach:

1. User-encrypted
2. Encrypted at rest
3. Per-project (Workbook, Document, etc.) permissions

Using this approach, the user would need to enter a password once to decrypt the stored credential manager information.
There are no reasonable ways to securely embed a decryption key with the credential manager, so the best option is to put the user in charge of the master key.
This is the approach used by password managers and it should work very well here in combination with AES-256 encryption.

## Implementation

With these goals in mind, the credential manager could be implemented as a VBA add-in for Excel support on Windows and Mac and a VSTO add-in for Office on Windows support.
This would limit Mac support to only Excel, unfortunately, but there could be options for embedding the library in documents.
It would be very nice to use a web-based Office Add-in, but as this is intended for use with VBA, that approach isn't possible.

### UI

Installing the add-in would add items to the ribbon for unlocking the credential manager and viewing items stored in the credential manager.

Forms:

1. Unlock: User enters the encryption key (password) to unlock the credential manager
2. Request Permissions: Document requests permissions to access certain groups in the credential manager
3. View/Edit Items: User can view all items in the credential manager, make changes to the items, and delete all items

### API

The credential manager consists of key-values, scoped by some unique identifier.
The scope is required due to the fact that the credential manager stores values globally and there is no built-in approach for uniquely identifying a document in VBA.
Scopes allow values to be shared between documents, but this requires explicitly getting user permission to access the scope since any document could attempt to access it.

```vb
' The Group ID can be unique to the application/document
' or shared between a set of applications/documents/company
Private Const GroupId As String = "ABC Company Inc."

Sub MakeRequest
  ' Request permissions to view/edit the values stored for "ABC Company Inc."
  ' and then load stored Google API Key
  Dim GoogleApiKey As String
  If CredentialManager.HasPermission(GroupId) Then
    GoogleApiKey = CredentialManager(GroupId)("GoogleApiKey")
  End If
  
  If GoogleApiKey = "" Then
    GoogleApiKey = InputBox("Enter Google API Key")
    
    ' Note: HasPermission is cached here (user is only prompted on first attempt)
    If CredentialManager.HasPermission(GroupId) Then
      CredentialManager(GroupId)("GoogleApiKey") = GoogleApiKey
    End If
  End If
  
  ' Make request with Google API key...
End Sub
```

In order to store which permissions have been granted to a document, the granted permissions would be stored securely in the credential manager.
But, this requires identifying the document, which was accepted as having no built-in approach above.
For this reason and to avoid potential spoofing of document identifiers to access the credential manager,
the user must give/deny permission every time the document is opened. This is not ideal, but it is the most secure approach until a secure alternative is found.

### Encryption

TODO...
