# Submission Checklist

## Already Prepared In Repo
- [x] Manifest V3 extension
- [x] 16 / 48 / 128 icons
- [x] Store listing draft
- [x] Privacy and permissions draft
- [x] Upload zip build script output target

## You Still Need Before Submit
- [ ] Chrome Web Store developer account
- [ ] Public support email
- [ ] At least 1 store screenshot
- [ ] Optional privacy policy page URL
- [ ] Final version number check

## Suggested Submission Steps
1. Open Chrome Developer Dashboard
2. Create new item
3. Upload `dist/dingpan-helper-cws.zip`
4. Fill in listing copy from `store/LISTING.md`
5. Fill in privacy fields from `store/PRIVACY.md`
6. Upload screenshots
7. Submit for review

## Packaging Notes
上传 zip 中不包含：
- `.chrome-dev-profile/`
- `store/`
- 本地调试文件

## Suggested Versioning
- First store submission: `0.1.0`
- Any resubmission after review feedback: bump patch version to `0.1.1`
