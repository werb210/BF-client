//
//  BorealLiveActivityLiveActivity.swift
//  BorealLiveActivity
//
//  Created by Todd Werboweski on 2026-09-17.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct BorealLiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct BorealLiveActivityLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BorealLiveActivityAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension BorealLiveActivityAttributes {
    fileprivate static var preview: BorealLiveActivityAttributes {
        BorealLiveActivityAttributes(name: "World")
    }
}

extension BorealLiveActivityAttributes.ContentState {
    fileprivate static var smiley: BorealLiveActivityAttributes.ContentState {
        BorealLiveActivityAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: BorealLiveActivityAttributes.ContentState {
         BorealLiveActivityAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: BorealLiveActivityAttributes.preview) {
   BorealLiveActivityLiveActivity()
} contentStates: {
    BorealLiveActivityAttributes.ContentState.smiley
    BorealLiveActivityAttributes.ContentState.starEyes
}
