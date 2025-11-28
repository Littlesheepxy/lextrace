import difflib

text1 = """If and for so long as you are not represented on the Company’s Board or any committee of the Company, and if you are a Major Investor but not a Competitor (as defined in the IRA), the Company shall invite you to send a representative to attend in a nonvoting observer capacity all regularly scheduled meetings of its Board and such committee thereof, and, in this respect, the Company shall give such representative copies of all notices, minutes, consents and other material that the Company provides to its directors or members of such committee. Upon reasonable notice and at a scheduled meeting of the Board or such other time, if any, such representative may address the Board with respect to your concerns regarding significant business issues facing the Company."""

text2 = """If and for so long as you are not represented on the Company’s Board or any committee of the Company, and if you are not a Competitor (as defined in the IRA), you or your designated representative shall be entitled to the same notice of such meetings and information relating to same as is given to the members of the Board, including without limitation, copies of all notices, minutes, consents and other material that the Company provides to its directors or members of such committee. Upon reasonable notice and at a scheduled meeting of the Board or such other time, if any, such representative may address the Board with respect to your concerns regarding significant business issues facing the Company. Notwithstanding anything to the contrary contained under this Section 3, the Company does not have to comply with the information rights given to you under this Section 3 if and to the extent that any compliance with this Section 3 might have adverse effect over the status of you as a passive investor in the Company as evidenced by an opinion of counsel reasonably acceptable to you."""

ratio = difflib.SequenceMatcher(None, text1, text2).ratio()
print(f"Similarity Ratio: {ratio}")

# Token-based Similarity
tokens1 = text1.split()
tokens2 = text2.split()
token_ratio = difflib.SequenceMatcher(None, tokens1, tokens2).ratio()
print(f"Token-based Ratio: {token_ratio}")
